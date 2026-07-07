import type { PointerEventHandler } from "react";

export type PaneResizeHandleProps = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
};

export function PaneResizeHandle({ onPointerDown }: PaneResizeHandleProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group relative h-full w-1.5 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-border/70"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent group-hover:bg-accent" />
    </div>
  );
}
