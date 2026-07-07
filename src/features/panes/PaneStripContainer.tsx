import { useCallback, useEffect, useRef } from "react";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { selectActivePaneIds } from "../../stores/selectors";
import { layoutController } from "../../core/webview/LayoutController";
import { webviewManager } from "../../core/webview/WebviewManager";
import { createSmoothScroller } from "../../lib/smoothScroll";
import { PaneStrip } from "../../components/pane/PaneStrip";
import { AddPaneTile } from "../../components/pane/AddPaneTile";
import { PaneItem } from "./PaneItem";
import { resolveMoveIndex } from "./dragOrder";
import { scrollPaneIntoView } from "./paneNavigation";
import type { PaneId } from "../../types";

export function PaneStripContainer() {
  const paneIds = useAppStore(selectActivePaneIds);
  const movePane = useAppStore((s) => s.movePane);
  const setAddPaneOpen = useUiStore((s) => s.setAddPaneOpen);
  const setOverlay = useUiStore((s) => s.setOverlay);
  const focusedPaneId = useUiStore((s) => s.focusedPaneId);

  // ドラッグ開始はヘッダーのグリップ（dragHandleProps）のみに listeners が付くため、
  // 誤反応を避けるための distance constraint は最小限で十分。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const containerElRef = useRef<HTMLDivElement | null>(null);
  const handleContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el;
    layoutController.registerContainer(el);
  }, []);

  // ペイン追加時は右端まで自動スクロールし、新ペインと追加タイルを必ず見せる。
  const prevPaneCountRef = useRef(paneIds.length);
  useEffect(() => {
    const el = containerElRef.current;
    if (el && paneIds.length > prevPaneCountRef.current) {
      el.scrollLeft = el.scrollWidth;
    }
    prevPaneCountRef.current = paneIds.length;
  }, [paneIds.length]);

  // フォーカス変化（クリック / レール / ⌘n / ⌘R・⌘W いずれの経路でも focusedPaneId が
  // 更新される）に追随して、枠外にあれば全体が収まるようスクロールする。レール側
  // `selectPane` の既存スクロールと重複しても冪等（同じ要素への scrollIntoView）で害はない。
  useEffect(() => {
    if (!focusedPaneId) return;
    scrollPaneIntoView(focusedPaneId);
  }, [focusedPaneId]);

  // 未フォーカスペイン上の wheel は `pane://wheel` で転送される（`WebviewManager`）。
  // 横ジェスチャ（deltaX）のみ、慣性補間（smoothScroll）でストリップスクロールに反映する。
  // 縦→横の変換はしない: トラックパッドの縦スワイプが横スクロールになるのは直感に反する
  // ため、未フォーカスペイン上の縦スワイプは「何もしない」が正しい。
  useEffect(() => {
    const scroller = createSmoothScroller(() => containerElRef.current);
    const unsubscribe = webviewManager.onPaneWheel((_paneId, deltaX) => {
      scroller.addDelta(deltaX);
    });
    return () => {
      unsubscribe();
      scroller.cancel();
    };
  }, []);

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
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={paneIds} strategy={horizontalListSortingStrategy}>
        <PaneStrip containerRef={handleContainerRef}>
          {paneIds.map((paneId) => (
            <PaneItem key={paneId} paneId={paneId} />
          ))}
          <AddPaneTile onClick={() => setAddPaneOpen(true)} />
        </PaneStrip>
      </SortableContext>
    </DndContext>
  );
}
