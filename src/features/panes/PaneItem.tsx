import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { webviewManager } from "../../core/webview/WebviewManager";
import { layoutController } from "../../core/webview/LayoutController";
import { PaneHeader } from "../../components/pane/PaneHeader";
import { PanePlaceholder } from "../../components/pane/PanePlaceholder";
import { PaneResizeHandle } from "../../components/pane/PaneResizeHandle";
import { MIN_PANE_WIDTH } from "../../lib/constants";
import { useResizePane } from "./useResizePane";
import type { PaneId } from "../../types";

export type PaneItemProps = {
  paneId: PaneId;
};

export function PaneItem({ paneId }: PaneItemProps) {
  const pane = useAppStore((s) => s.panes[paneId]);
  const updatePane = useAppStore((s) => s.updatePane);
  const removePane = useAppStore((s) => s.removePane);
  const setPaneWidth = useAppStore((s) => s.setPaneWidth);
  const runtime = useUiStore((s) => s.paneRuntime[paneId]);
  const overlay = useUiStore((s) => s.overlay);
  const setOverlay = useUiStore((s) => s.setOverlay);
  const removePaneRuntime = useUiStore((s) => s.removePaneRuntime);
  const focused = useUiStore((s) => s.focusedPaneId === paneId);
  const setFocusedPane = useUiStore((s) => s.setFocusedPane);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: paneId });

  const handleBodyRef = useCallback(
    (el: HTMLDivElement | null) => {
      layoutController.registerPlaceholder(paneId, el);
    },
    [paneId],
  );

  const handleStartResize = useCallback(
    () => setOverlay("resizing"),
    [setOverlay],
  );
  const handleEndResize = useCallback(() => setOverlay("none"), [setOverlay]);

  // ヘッダー上の pointerdown は root（App）の「他所クリックでフォーカス解除」より先に
  // 自ペインへのフォーカスを確定させる。stopPropagation で root ハンドラの発火を防ぐ。
  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setFocusedPane(paneId);
    },
    [paneId, setFocusedPane],
  );

  const handleResizePointerDown = useResizePane({
    paneId,
    width: pane?.width ?? MIN_PANE_WIDTH,
    onResize: setPaneWidth,
    onStart: handleStartResize,
    onEnd: handleEndResize,
  });

  if (!pane) return null;

  const handleReload = () => {
    void webviewManager.reload(paneId);
  };

  const handleToggleMute = () => {
    const muted = !pane.muted;
    updatePane(paneId, { muted });
    void webviewManager.setMuted(paneId, muted);
  };

  const handleClose = () => {
    if (!window.confirm(`「${pane.title}」を閉じる？セッションも削除される`))
      return;
    removePane(paneId);
    removePaneRuntime(paneId);
  };

  return (
    <div
      ref={setNodeRef}
      data-pane-id={paneId}
      className="flex h-full shrink-0"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <PanePlaceholder
        width={pane.width}
        header={
          <PaneHeader
            title={pane.title}
            url={runtime?.currentUrl ?? pane.url}
            muted={pane.muted}
            isLoading={runtime?.isLoading ?? false}
            focused={focused}
            onReload={handleReload}
            onToggleMute={handleToggleMute}
            onClose={handleClose}
            onPointerDown={handleHeaderPointerDown}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        }
        bodyRef={handleBodyRef}
        showCard={overlay !== "none" || runtime?.lifecycle === "hidden"}
        cardTitle={pane.title}
      />
      <PaneResizeHandle onPointerDown={handleResizePointerDown} />
    </div>
  );
}
