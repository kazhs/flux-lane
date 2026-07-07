import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePanes } from "../../stores/selectors";
import type { OverlayMode, PaneId, Rect } from "../../types";
import {
  createPaneWebview,
  destroyPaneWebview,
  evalInPane,
  focusWebview,
  reloadPane,
  setPaneBounds,
  setPaneVisible,
} from "../ipc/commands";
import {
  onPanePageLoad,
  onPanePointerDown,
  onPaneWheel as onPaneWheelEvent,
} from "../ipc/events";
import type {
  PaneLoadEventPayload,
  PanePointerDownEventPayload,
  PaneWheelEventPayload,
} from "../ipc/types";
import { labelForPane, paneIdFromLabel } from "./paneLabel";
import { computeWebviewOps } from "./reconcile";
import { MUTE_SCRIPT, UNMUTE_SCRIPT } from "./scripts";

type Unsubscribe = () => void;
type PaneWheelCallback = (
  paneId: PaneId,
  deltaX: number,
  deltaY: number,
) => void;

/** ペイン webview の initialization script（`__fluxLaneSetFocused`）に対する eval。
 * script 未注入（remote IPC 不成立）の環境でも例外にならないようガードする。 */
export function setFocusedScript(focused: boolean): string {
  return `window.__fluxLaneSetFocused && window.__fluxLaneSetFocused(${focused});`;
}

/**
 * store の subscriber として native webview の create/destroy/visibility を同期する facade。
 * store が唯一の真実で、React コンポーネントは native webview を直接触らない
 * （docs/ARCHITECTURE.md 1.4）。
 *
 * workspace 切替は「旧 active workspace のペインを destroy → 新 active workspace のペインを
 * create」として reconcile されるだけで、これがそのまま suspended 状態の実体になる。
 */
class WebviewManager {
  /** 生成済み webview: paneId -> 生成時の sessionId。 */
  private readonly createdSessionIds = new Map<PaneId, string>();
  /** create 失敗したペイン。次の reconcile で再試行しない（手動 reload で解除）。 */
  private readonly failedPaneIds = new Set<PaneId>();
  private readonly unsubscribers: Unsubscribe[] = [];
  private unlistenPageLoad: Unsubscribe | null = null;
  private unlistenPointerDown: Unsubscribe | null = null;
  private unlistenWheel: Unsubscribe | null = null;
  private readonly wheelCallbacks = new Set<PaneWheelCallback>();
  private started = false;

  async init(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.reconcile();

    this.unsubscribers.push(
      useAppStore.subscribe(() => {
        void this.reconcile();
      }),
    );
    this.unsubscribers.push(
      useUiStore.subscribe((state, prevState) => {
        if (state.overlay !== prevState.overlay) {
          this.handleOverlayChange(state.overlay);
        }
        if (state.focusedPaneId !== prevState.focusedPaneId) {
          this.handleFocusChange(prevState.focusedPaneId, state.focusedPaneId);
        }
      }),
    );

    this.unlistenPageLoad = await onPanePageLoad((payload) => {
      this.handlePageLoad(payload);
    });
    this.unlistenPointerDown = await onPanePointerDown((payload) => {
      this.handlePanePointerDown(payload);
    });
    this.unlistenWheel = await onPaneWheelEvent((payload) => {
      this.handlePaneWheelEvent(payload);
    });
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers.length = 0;
    this.unlistenPageLoad?.();
    this.unlistenPageLoad = null;
    this.unlistenPointerDown?.();
    this.unlistenPointerDown = null;
    this.unlistenWheel?.();
    this.unlistenWheel = null;
    this.started = false;
  }

  /** ペインの wheel 転送（`pane://wheel`）を購読する。PaneStripContainer 等の UI 層から呼ぶ。 */
  onPaneWheel(callback: PaneWheelCallback): Unsubscribe {
    this.wheelCallbacks.add(callback);
    return () => {
      this.wheelCallbacks.delete(callback);
    };
  }

  /** LayoutController からの通知を受け、変化した bounds だけを ipc へ送る。 */
  async setBounds(rects: ReadonlyMap<PaneId, Rect>): Promise<void> {
    for (const [paneId, rect] of rects) {
      if (!this.createdSessionIds.has(paneId)) continue;
      try {
        await setPaneBounds(labelForPane(paneId), rect);
      } catch (error) {
        console.error(
          `[WebviewManager] set_pane_bounds failed for pane ${paneId}:`,
          error,
        );
      }
    }
  }

  async reload(paneId: PaneId): Promise<void> {
    if (this.failedPaneIds.has(paneId)) {
      // 手動 reload を create 失敗フラグの解除トリガーとし、次の reconcile で再試行する。
      this.failedPaneIds.delete(paneId);
      void this.reconcile();
      return;
    }
    if (!this.createdSessionIds.has(paneId)) return;
    try {
      await reloadPane(labelForPane(paneId));
    } catch (error) {
      console.error(
        `[WebviewManager] reload_pane failed for pane ${paneId}:`,
        error,
      );
    }
  }

  /** ミュート/解除の JS 注入のみを行う。store 更新は呼び出し側の責務。 */
  async setMuted(paneId: PaneId, muted: boolean): Promise<void> {
    if (!this.createdSessionIds.has(paneId)) return;
    await evalInPane(labelForPane(paneId), muted ? MUTE_SCRIPT : UNMUTE_SCRIPT);
  }

  private async reconcile(): Promise<void> {
    // 削除済みペインの failed フラグはここで払う（無限に Set が育まないように）。
    const allPaneIds = new Set(Object.keys(useAppStore.getState().panes));
    for (const paneId of this.failedPaneIds) {
      if (!allPaneIds.has(paneId)) this.failedPaneIds.delete(paneId);
    }

    const activePanes = selectActivePanes(useAppStore.getState());
    const desired = activePanes
      .filter((pane) => !this.failedPaneIds.has(pane.id))
      .map((pane) => ({
        paneId: pane.id,
        url: pane.url,
        sessionId: pane.sessionId,
      }));

    const { creates, destroys } = computeWebviewOps(
      this.createdSessionIds,
      desired,
    );

    for (const paneId of destroys) {
      this.createdSessionIds.delete(paneId);
      if (useUiStore.getState().focusedPaneId === paneId) {
        useUiStore.getState().setFocusedPane(null);
      }
      // store から完全に消えたペイン（どの workspace にも属さない）だけ purge_data する。
      // workspace 切替による suspend はセッションを残す。
      const stillExists = Boolean(useAppStore.getState().panes[paneId]);
      try {
        await destroyPaneWebview(labelForPane(paneId), !stillExists);
      } catch (error) {
        console.error(
          `[WebviewManager] destroy_pane_webview failed for pane ${paneId}:`,
          error,
        );
      }
    }

    for (const op of creates) {
      try {
        // 初期 bounds は 0 埋め: 実座標は直後の LayoutController -> setBounds で反映される。
        await createPaneWebview({
          label: labelForPane(op.paneId),
          url: op.url,
          sessionId: op.sessionId,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
        });
        this.createdSessionIds.set(op.paneId, op.sessionId);
      } catch (error) {
        console.error(
          `[WebviewManager] create_pane_webview failed for pane ${op.paneId}:`,
          error,
        );
        // 次の reconcile（store 更新のたびに走る）で無限に再 create を試みないよう記録する。
        this.failedPaneIds.add(op.paneId);
      }
    }
  }

  private handleOverlayChange(overlay: OverlayMode): void {
    const visible = overlay === "none";
    for (const paneId of this.createdSessionIds.keys()) {
      void setPaneVisible(labelForPane(paneId), visible);
    }
  }

  /** フォーカス移動: 旧ペインに false、新ペインに true を eval し、null になったら
   * キーボードフォーカスを "main-ui" に戻す（ペインフォーカスモデル）。 */
  private handleFocusChange(
    previous: PaneId | null,
    next: PaneId | null,
  ): void {
    if (previous && previous !== next && this.createdSessionIds.has(previous)) {
      void evalInPane(labelForPane(previous), setFocusedScript(false));
    }
    if (next && this.createdSessionIds.has(next)) {
      void evalInPane(labelForPane(next), setFocusedScript(true));
    }
    if (next === null) {
      void focusWebview("main-ui");
    }
  }

  private handlePanePointerDown(payload: PanePointerDownEventPayload): void {
    const paneId = paneIdFromLabel(payload.label);
    if (!paneId) return;
    useUiStore.getState().setFocusedPane(paneId);
  }

  private handlePaneWheelEvent(payload: PaneWheelEventPayload): void {
    const paneId = paneIdFromLabel(payload.label);
    if (!paneId) return;
    for (const callback of this.wheelCallbacks) {
      callback(paneId, payload.deltaX, payload.deltaY);
    }
  }

  private handlePageLoad(payload: PaneLoadEventPayload): void {
    const paneId = paneIdFromLabel(payload.label);
    if (!paneId) return;

    const uiState = useUiStore.getState();
    uiState.setPaneLoading(paneId, payload.event === "started");

    if (payload.event === "finished") {
      uiState.setPaneCurrentUrl(paneId, payload.url);

      const pane = useAppStore.getState().panes[paneId];
      if (pane?.muted) {
        // ナビゲーションで init script が消えるため、finished 時に再 eval する。
        void evalInPane(labelForPane(paneId), MUTE_SCRIPT);
      }

      // ナビゲーションで init script が再実行され focused=false に初期化されるため、
      // app 側がフォーカス中と認識しているペインには focus 状態を再送する。
      if (uiState.focusedPaneId === paneId) {
        void evalInPane(labelForPane(paneId), setFocusedScript(true));
      }
    }
  }
}

export const webviewManager = new WebviewManager();
