import {
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePaneIds } from "../../stores/selectors";
import { PaneRail, type PaneRailItem } from "../../components/pane/PaneRail";
import { iconForUrl } from "../../components/pane/servicePresetIcons";
import { PRESET_SERVICES } from "../../core/services";
import { popupPaneMenu } from "../../core/ipc/commands";
import { onPaneMenuAction } from "../../core/ipc/events";
import { labelForPane, paneIdFromLabel } from "../../core/webview/paneLabel";
import { confirmDialog } from "../../core/ipc/dialog";
import { shortcutLabel } from "../../lib/shortcutLabel";
import { resolvePaneDisplayName } from "./paneDisplay";
import { selectPane } from "./paneNavigation";
import type { Pane, PaneId, PaneRuntimeState } from "../../types";

function resolveIcon(
  pane: Pane,
  runtime: PaneRuntimeState | undefined,
): ReactNode {
  const url = runtime?.currentUrl ?? pane.url;
  const presetIcon = iconForUrl(url);
  if (presetIcon) return presetIcon;

  return (
    <span className="flex h-4 w-4 items-center justify-center rounded border border-border text-[10px] font-medium text-text-dim">
      {pane.title.charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function PaneRailContainer() {
  const paneIds = useAppStore(selectActivePaneIds);
  const panes = useAppStore((s) => s.panes);
  const paneRuntime = useUiStore((s) => s.paneRuntime);
  const focusedPaneId = useUiStore((s) => s.focusedPaneId);
  const removePane = useAppStore((s) => s.removePane);
  const removePaneRuntime = useUiStore((s) => s.removePaneRuntime);
  const setView = useUiStore((s) => s.setView);

  // レールのネイティブコンテキストメニュー（Rust 側 `popup_pane_menu`）からの削除操作を
  // 受け取る。クリックによるジャンプ + フォーカスは既存の handleSelect のまま変更しない。
  useEffect(() => {
    // listen() は非同期に解決するため、cleanup が unlisten 取得前に走ると listener が
    // 永久に残る（StrictMode の二重マウント・ビュー切替の再マウントで 1 個ずつ増え、
    // 削除確認モーダルが多重表示される実バグになった）。cancelled ガードで解決直後に破棄する。
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void onPaneMenuAction(async (payload) => {
      if (payload.action !== "delete") return;
      const paneId = paneIdFromLabel(payload.label);
      if (!paneId) return;
      const pane = useAppStore.getState().panes[paneId];
      const title = pane?.title ?? paneId;
      const ok = await confirmDialog(
        `「${title}」を閉じる？セッションも削除される`,
      );
      if (!ok) return;
      removePane(paneId);
      removePaneRuntime(paneId);
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
      unlisten = undefined;
    };
  }, [removePane, removePaneRuntime]);

  const items: PaneRailItem[] = paneIds
    .map((paneId) => panes[paneId])
    .filter((pane): pane is Pane => pane !== undefined)
    .map((pane, index) => {
      const runtime = paneRuntime[pane.id];
      const url = runtime?.currentUrl ?? pane.url;
      return {
        paneId: pane.id,
        title: resolvePaneDisplayName(url, pane.title, PRESET_SERVICES),
        accountLabel: runtime?.accountLabel ?? null,
        shortcut: shortcutLabel("⌘", index + 1),
        iconNode: resolveIcon(pane, runtime),
        focused: focusedPaneId === pane.id,
      };
    });

  const handleContextMenu = (paneId: PaneId, event: ReactMouseEvent) => {
    event.preventDefault();
    void popupPaneMenu(labelForPane(paneId));
  };

  return (
    <PaneRail
      items={items}
      onSelect={selectPane}
      onContextMenu={handleContextMenu}
      onAddPane={() => setView("add-pane")}
    />
  );
}
