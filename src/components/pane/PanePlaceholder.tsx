import type { ReactNode, Ref } from "react";
import { PANE_SCROLLBAR_RESERVE_HEIGHT } from "../../lib/constants";

export type PanePlaceholderProps = {
  width: number;
  header: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  showCard?: boolean;
  cardTitle?: string;
};

export function PanePlaceholder({
  width,
  header,
  bodyRef,
  showCard = false,
  cardTitle,
}: PanePlaceholderProps) {
  return (
    <div className="flex h-full shrink-0 flex-col" style={{ width }}>
      {header}
      {/* bg は透過: body のグラデーションを透けさせる（この面は通常 WebView に覆われる）。 */}
      <div ref={bodyRef} className="relative flex-1 bg-transparent">
        {showCard && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-dim">
              {cardTitle}
            </div>
          </div>
        )}
      </div>
      {/* WebView は body の rect にしか重ならないため、この帯だけ常に DOM が
          透ける。ストリップの横スクロールバーがここに収まり、隠れず操作できる。 */}
      <div
        className="shrink-0 bg-transparent"
        style={{ height: PANE_SCROLLBAR_RESERVE_HEIGHT }}
        aria-hidden="true"
      />
    </div>
  );
}
