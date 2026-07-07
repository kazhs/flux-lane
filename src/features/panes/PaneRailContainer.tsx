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
import { popupPaneMenu } from "../../core/ipc/commands";
import { onPaneMenuAction } from "../../core/ipc/events";
import { labelForPane, paneIdFromLabel } from "../../core/webview/paneLabel";
import { confirmDialog } from "../../core/ipc/dialog";
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

/** レール起点のジャンプ: strip 側の scroll イベントを LayoutController が拾って
 * WebView bounds を追随させる既存機構に乗せる（新規の同期経路は作らない）。 */
function scrollPaneIntoView(paneId: PaneId): void {
  const el = document.querySelector(`[data-pane-id="${paneId}"]`);
  el?.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}

export function PaneRailContainer() {
  const paneIds = useAppStore(selectActivePaneIds);
  const panes = useAppStore((s) => s.panes);
  const paneRuntime = useUiStore((s) => s.paneRuntime);
  const focusedPaneId = useUiStore((s) => s.focusedPaneId);
  const removePane = useAppStore((s) => s.removePane);
  const removePaneRuntime = useUiStore((s) => s.removePaneRuntime);
  const setFocusedPane = useUiStore((s) => s.setFocusedPane);

  // レールのネイティブコンテキストメニュー（Rust 側 `popup_pane_menu`）からの削除操作を
  // 受け取る。クリックによるジャンプ + フォーカスは既存の handleSelect のまま変更しない。
  useEffect(() => {
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
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [removePane, removePaneRuntime]);

  const items: PaneRailItem[] = paneIds
    .map((paneId) => panes[paneId])
    .filter((pane): pane is Pane => pane !== undefined)
    .map((pane) => ({
      paneId: pane.id,
      title: pane.title,
      iconNode: resolveIcon(pane, paneRuntime[pane.id]),
      focused: focusedPaneId === pane.id,
    }));

  const handleSelect = (paneId: PaneId) => {
    scrollPaneIntoView(paneId);
    setFocusedPane(paneId);
  };

  const handleContextMenu = (paneId: PaneId, event: ReactMouseEvent) => {
    event.preventDefault();
    void popupPaneMenu(labelForPane(paneId));
  };

  return (
    <PaneRail
      items={items}
      onSelect={handleSelect}
      onContextMenu={handleContextMenu}
    />
  );
}
