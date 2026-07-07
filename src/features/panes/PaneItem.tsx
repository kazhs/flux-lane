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
import { PaneSideMenu } from "../../components/pane/PaneSideMenu";
import { MIN_PANE_WIDTH } from "../../lib/constants";
import { useResizePane } from "./useResizePane";
import { closePaneWithConfirm } from "./paneClose";
import { resolvePaneDisplayName } from "./paneDisplay";
import { PRESET_SERVICES } from "../../core/services";
import type { PaneId } from "../../types";

export type PaneItemProps = {
  paneId: PaneId;
};

export function PaneItem({ paneId }: PaneItemProps) {
  const pane = useAppStore((s) => s.panes[paneId]);
  const updatePane = useAppStore((s) => s.updatePane);
  const setPaneWidth = useAppStore((s) => s.setPaneWidth);
  const runtime = useUiStore((s) => s.paneRuntime[paneId]);
  const overlay = useUiStore((s) => s.overlay);
  const setOverlay = useUiStore((s) => s.setOverlay);
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

  // 表示名はレールと同じ解決規則（プリセット一致ならサービス名。保存済みの
  // "X 2" 等の旧連番タイトルもここで吸収される）。
  const displayName = resolvePaneDisplayName(
    runtime?.currentUrl ?? pane.url,
    pane.title,
    PRESET_SERVICES,
  );

  const handleReload = () => {
    void webviewManager.reload(paneId);
  };

  const handleToggleMute = () => {
    const muted = !pane.muted;
    updatePane(paneId, { muted });
    void webviewManager.setMuted(paneId, muted);
  };

  const handleClose = () => {
    void closePaneWithConfirm(paneId, displayName);
  };

  const handleToggleAutoScroll = () => {
    const autoScroll = !pane.autoScroll;
    updatePane(paneId, { autoScroll });
    void webviewManager.setAutoScroll(paneId, autoScroll);
  };

  const handleBack = () => {
    void webviewManager.goBack(paneId);
  };

  const handleForward = () => {
    void webviewManager.goForward(paneId);
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
      <PaneSideMenu
        autoScroll={pane.autoScroll}
        muted={pane.muted}
        isLoading={runtime?.isLoading ?? false}
        onReload={handleReload}
        onToggleAutoScroll={handleToggleAutoScroll}
        onToggleMute={handleToggleMute}
      />
      <PanePlaceholder
        width={pane.width}
        header={
          <PaneHeader
            title={displayName}
            url={runtime?.currentUrl ?? pane.url}
            accountLabel={runtime?.accountLabel ?? null}
            focused={focused}
            onPointerDown={handleHeaderPointerDown}
            dragHandleProps={{ ...attributes, ...listeners }}
            onBack={handleBack}
            onForward={handleForward}
            onClose={handleClose}
          />
        }
        bodyRef={handleBodyRef}
        showCard={overlay !== "none" || runtime?.lifecycle === "hidden"}
        cardTitle={displayName}
      />
      <PaneResizeHandle onPointerDown={handleResizePointerDown} />
    </div>
  );
}
