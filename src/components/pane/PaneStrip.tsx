import type { ReactNode, Ref } from "react";

export type PaneStripProps = {
  children: ReactNode;
  containerRef?: Ref<HTMLDivElement>;
};

export function PaneStrip({ children, containerRef }: PaneStripProps) {
  return (
    <div ref={containerRef} className="flex h-full overflow-x-auto">
      {children}
    </div>
  );
}
