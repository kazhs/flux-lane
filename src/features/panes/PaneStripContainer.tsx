import { useCallback } from "react";
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
import { PaneStrip } from "../../components/pane/PaneStrip";
import { AddPaneTile } from "../../components/pane/AddPaneTile";
import { PaneItem } from "./PaneItem";
import { resolveMoveIndex } from "./dragOrder";
import type { PaneId } from "../../types";

export function PaneStripContainer() {
  const paneIds = useAppStore(selectActivePaneIds);
  const movePane = useAppStore((s) => s.movePane);
  const setView = useUiStore((s) => s.setView);
  const setOverlay = useUiStore((s) => s.setOverlay);

  // ドラッグ開始はヘッダーのグリップ（dragHandleProps）のみに listeners が付くため、
  // 誤反応を避けるための distance constraint は最小限で十分。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleContainerRef = useCallback((el: HTMLDivElement | null) => {
    layoutController.registerContainer(el);
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
          <AddPaneTile onClick={() => setView("add-pane")} />
        </PaneStrip>
      </SortableContext>
    </DndContext>
  );
}
