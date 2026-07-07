import type { MouseEvent, ReactNode } from "react";
import type { PaneId } from "../../types";

export type PaneRailItem = {
  paneId: PaneId;
  title: string;
  iconNode: ReactNode;
  focused: boolean;
};

export type PaneRailProps = {
  items: PaneRailItem[];
  onSelect: (paneId: PaneId) => void;
  onContextMenu: (paneId: PaneId, event: MouseEvent) => void;
};

const RAIL_WIDTH = 44;

/**
 * アクティブ workspace のペインを縦に一覧する常設レール。ペイン列の左に置く
 * （docs/ARCHITECTURE.md 1.2: DOM 常時露出領域なので Overlay 不要）。
 * 削除操作はネイティブコンテキストメニュー経由（`onContextMenu`）のみ。
 */
export function PaneRail({ items, onSelect, onContextMenu }: PaneRailProps) {
  return (
    <div
      className="flex h-full shrink-0 flex-col overflow-y-auto border-r border-border bg-surface"
      style={{ width: RAIL_WIDTH, scrollbarWidth: "none" }}
    >
      <div className="flex flex-col gap-1 pt-2">
        {items.map((item) => (
          <div key={item.paneId} className="flex justify-center">
            <button
              type="button"
              title={item.title}
              onClick={() => onSelect(item.paneId)}
              onContextMenu={(event) => onContextMenu(item.paneId, event)}
              className={`relative flex h-8 w-8 items-center justify-center rounded text-text-dim transition-colors hover:bg-surface-hover hover:text-text ${
                item.focused ? "bg-surface-hover text-text" : ""
              }`}
            >
              {item.focused && (
                <div
                  className="absolute inset-y-0.5 left-0 w-0.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
              {item.iconNode}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
