import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePanes } from "../../stores/selectors";
import { PRESET_SERVICES } from "../services";
import { matchServiceByUrl } from "../../lib/matchServiceByUrl";
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
  onPaneAccount,
  onPanePageLoad,
  onPanePointerDown,
  onPaneWheel as onPaneWheelEvent,
} from "../ipc/events";
import type {
  PaneAccountEventPayload,
  PaneLoadEventPayload,
  PanePointerDownEventPayload,
  PaneWheelEventPayload,
} from "../ipc/types";
import { labelForPane, paneIdFromLabel } from "./paneLabel";
import { computeWebviewOps } from "./reconcile";
import {
  AUTO_SCROLL_START_SCRIPT,
  AUTO_SCROLL_STOP_SCRIPT,
  MUTE_SCRIPT,
  UNMUTE_SCRIPT,
} from "./scripts";

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
  /** LayoutController が「常設レールの左境界をまたいだ」と判定した pane。
   * 表示可否は overlay と両方の AND で決まる（`applyVisibility`）。 */
  private readonly layoutHidden = new Set<PaneId>();
  private readonly unsubscribers: Unsubscribe[] = [];
  private unlistenPageLoad: Unsubscribe | null = null;
  private unlistenPointerDown: Unsubscribe | null = null;
  private unlistenWheel: Unsubscribe | null = null;
  private unlistenAccount: Unsubscribe | null = null;
  private readonly wheelCallbacks = new Set<PaneWheelCallback>();
  private started = false;
  private reconcileRunning = false;
  private reconcileQueued = false;

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
    this.unlistenAccount = await onPaneAccount((payload) => {
      this.handlePaneAccount(payload);
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
    this.unlistenAccount?.();
    this.unlistenAccount = null;
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
        await setPaneBounds(labelForPane(paneId), rect, window.innerHeight);
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

  /** オートスクロール開始/停止の JS 注入のみを行う。store 更新は呼び出し側の責務。 */
  async setAutoScroll(paneId: PaneId, on: boolean): Promise<void> {
    if (!this.createdSessionIds.has(paneId)) return;
    await evalInPane(
      labelForPane(paneId),
      on ? AUTO_SCROLL_START_SCRIPT : AUTO_SCROLL_STOP_SCRIPT,
    );
  }

  /** LayoutController からの hidden 変化通知を受け、layoutHidden 集合を更新して
   * visibility を再計算する。変化した pane だけを runtime lifecycle にも反映する。 */
  setLayoutHidden(changes: ReadonlyMap<PaneId, boolean>): void {
    const overlay = useUiStore.getState().overlay;
    for (const [paneId, hidden] of changes) {
      if (hidden) {
        this.layoutHidden.add(paneId);
      } else {
        this.layoutHidden.delete(paneId);
      }
      this.applyVisibility(paneId, overlay);
      useUiStore
        .getState()
        .setPaneLifecycle(paneId, hidden ? "hidden" : "active");
    }
  }

  /** overlay と layoutHidden の AND で表示可否を決める共通ヘルパ。未生成の pane は無視する。
   * `resizing` は例外的に表示のまま: リサイズのリアルタイム確認のため WebView を隠さない
   * （幅計算はカーソル絶対座標ベースなのでイベント取りこぼしに耐える。useResizePane 参照）。 */
  private applyVisibility(paneId: PaneId, overlay: OverlayMode): void {
    if (!this.createdSessionIds.has(paneId)) return;
    const visible =
      (overlay === "none" || overlay === "resizing") &&
      !this.layoutHidden.has(paneId);
    void setPaneVisible(labelForPane(paneId), visible);
  }

  /**
   * reconcile の直列化ゲート。store 更新のたびに fire-and-forget で呼ばれるため、
   * 素の doReconcile を並行実行すると両方が同じ古い createdSessionIds から diff を
   * 計算し、同一ペインへの create 二重発行 →「already exists」で負けた側が
   * failedPaneIds に誤登録 → 次の reconcile が生きている webview を destroy する
   * （code review High #2）。実行中に要求が来たら 1 回だけ追加実行する。
   */
  private async reconcile(): Promise<void> {
    if (this.reconcileRunning) {
      this.reconcileQueued = true;
      return;
    }
    this.reconcileRunning = true;
    try {
      do {
        this.reconcileQueued = false;
        await this.doReconcile();
      } while (this.reconcileQueued);
    } finally {
      this.reconcileRunning = false;
    }
  }

  private async doReconcile(): Promise<void> {
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
      // LayoutController は placeholder unregister 時に自分の hidden 集合を払うだけなので、
      // ここで払わないと destroy 済み paneId が layoutHidden に残り続ける（表示には影響しないが
      // メモリリークになる）。
      this.layoutHidden.delete(paneId);
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
          viewportHeight: window.innerHeight,
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
    for (const paneId of this.createdSessionIds.keys()) {
      this.applyVisibility(paneId, overlay);
    }
  }

  /** フォーカス移動: 旧ペインに false、新ペインに true を eval し、null になったら
   * キーボードフォーカスを "main-ui" に戻す（ペインフォーカスモデル）。新ペインには
   * キーボードフォーカスも移す（レール起点のフォーカスでも移るように。クリック起点でも
   * 冪等なので分岐しない）。 */
  private handleFocusChange(
    previous: PaneId | null,
    next: PaneId | null,
  ): void {
    if (previous && previous !== next && this.createdSessionIds.has(previous)) {
      void evalInPane(labelForPane(previous), setFocusedScript(false));
    }
    if (next && this.createdSessionIds.has(next)) {
      void evalInPane(labelForPane(next), setFocusedScript(true));
      void focusWebview(labelForPane(next));
    }
    if (next === null) {
      void focusWebview("main-ui");
    }
  }

  private handlePanePointerDown(payload: PanePointerDownEventPayload): void {
    const paneId = paneIdFromLabel(payload.label);
    if (!paneId) return;
    // 真正性チェック: WebView が非表示（overlay 中 / layout hidden）のペインには
    // 実クリックが物理的に届かない。その状態で届いた通知はページ JS の直接 invoke
    // （フォーカス奪取の試み）なので無視する（code review High #1 の緩和策の一部）。
    if (useUiStore.getState().overlay !== "none") return;
    if (this.layoutHidden.has(paneId)) return;
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
      if (pane?.autoScroll) {
        // ナビゲーションで init script が消えるため、finished 時に再 eval する
        // （MUTE_SCRIPT と同じ理由）。
        void evalInPane(labelForPane(paneId), AUTO_SCROLL_START_SCRIPT);
      }

      // ナビゲーションで init script が再実行され focused=false に初期化されるため、
      // app 側がフォーカス中と認識しているペインには focus 状態を再送する。
      if (uiState.focusedPaneId === paneId) {
        void evalInPane(labelForPane(paneId), setFocusedScript(true));
      }

      // ナビゲーションで注入済みスクリプトが消えるため、finished 時に毎回再 eval する
      // （MUTE_SCRIPT と同じ理由）。currentUrl（ちょうど上で確定した値）優先で
      // マッチさせる: 同一 pane がリダイレクトで別サービスに移った場合にも追随する。
      const service = matchServiceByUrl(payload.url, PRESET_SERVICES);
      if (service?.accountProbeScript) {
        void evalInPane(labelForPane(paneId), service.accountProbeScript);
      }
    }
  }

  private handlePaneAccount(payload: PaneAccountEventPayload): void {
    const paneId = paneIdFromLabel(payload.label);
    if (!paneId) return;
    useUiStore.getState().setPaneAccountLabel(paneId, payload.handle);
  }
}

export const webviewManager = new WebviewManager();
