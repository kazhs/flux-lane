import {
  useCallback,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePaneIds } from "../../stores/selectors";
import { PaneRail, type PaneRailItem } from "../../components/pane/PaneRail";
import { iconForUrl } from "../../components/pane/servicePresetIcons";
import { PRESET_SERVICES } from "../../core/services";
import { popupPaneMenu } from "../../core/ipc/commands";
import { onPaneMenuAction } from "../../core/ipc/events";
import { labelForPane, paneIdFromLabel } from "../../core/webview/paneLabel";
import { shortcutLabel } from "../../lib/shortcutLabel";
import { resolvePaneDisplayName } from "./paneDisplay";
import { selectPane } from "./paneNavigation";
import { closePaneWithConfirm } from "./paneClose";
import { resolveMoveIndex } from "./dragOrder";
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
  const movePane = useAppStore((s) => s.movePane);
  const paneRuntime = useUiStore((s) => s.paneRuntime);
  const focusedPaneId = useUiStore((s) => s.focusedPaneId);
  const setOverlay = useUiStore((s) => s.setOverlay);
  const setView = useUiStore((s) => s.setView);

  // レールアイテムはクリック（ジャンプ）と onContextMenu も同じ button に持つため、
  // 誤反応を避ける distance constraint を strip 側（4px）よりやや広めに取る。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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
      await closePaneWithConfirm(paneId, title);
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
  }, []);

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

  // strip 側（PaneStripContainer）と同じ作法: ドラッグ中はポインタイベントが他 WebView に
  // 奪われるため、overlay を "dragging" にして抑止する。
  const handleDragStart = useCallback(() => {
    setOverlay("dragging");
  }, [setOverlay]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setOverlay("none");
      const toIndex = resolveMoveIndex(
        paneIds,
        event.active.id as PaneId,
        (event.over?.id as PaneId | undefined) ?? null,
      );
      if (toIndex === null) return;
      movePane(event.active.id as PaneId, toIndex);
    },
    [movePane, paneIds, setOverlay],
  );

  const handleDragCancel = useCallback(() => {
    setOverlay("none");
  }, [setOverlay]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={paneIds} strategy={verticalListSortingStrategy}>
        <PaneRail
          items={items}
          onSelect={selectPane}
          onContextMenu={handleContextMenu}
          onAddPane={() => setView("add-pane")}
        />
      </SortableContext>
    </DndContext>
  );
}
