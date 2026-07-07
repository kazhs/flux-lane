import type { MouseEvent, ReactNode } from "react";
import type { PaneId } from "../../types";
import { PlusIcon } from "../ui/icons";

export type PaneRailItem = {
  paneId: PaneId;
  title: string;
  /** サービスの `accountProbeScript` が検知したログイン中アカウントのハンドル。
   * 未検知・非対応サービスは null（アイコンのみ表示）。 */
  accountLabel: string | null;
  iconNode: ReactNode;
  focused: boolean;
};

export type PaneRailProps = {
  items: PaneRailItem[];
  onSelect: (paneId: PaneId) => void;
  onContextMenu: (paneId: PaneId, event: MouseEvent) => void;
  onAddPane: () => void;
};

const RAIL_WIDTH = 44;

/**
 * アクティブ workspace のペインを縦に一覧する常設レール。ペイン列の左に置く
 * （docs/ARCHITECTURE.md 1.2: DOM 常時露出領域なので Overlay 不要）。
 * 削除操作はネイティブコンテキストメニュー経由（`onContextMenu`）のみ。
 * アイテム列の直後に追加ボタンを置く。
 */
export function PaneRail({
  items,
  onSelect,
  onContextMenu,
  onAddPane,
}: PaneRailProps) {
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
              title={
                item.accountLabel
                  ? `${item.title} (${item.accountLabel})`
                  : item.title
              }
              onClick={() => onSelect(item.paneId)}
              onContextMenu={(event) => onContextMenu(item.paneId, event)}
              className={`relative flex w-10 flex-col items-center justify-center gap-0.5 rounded px-1 py-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text ${
                item.focused ? "bg-surface-hover text-text" : ""
              }`}
            >
              {item.focused && (
                <div
                  className="absolute inset-y-0.5 left-0 w-0.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
              <span className="flex h-4 w-4 items-center justify-center">
                {item.iconNode}
              </span>
              {item.accountLabel && (
                <span className="w-full truncate text-center text-[9px] leading-none">
                  {item.accountLabel}
                </span>
              )}
            </button>
          </div>
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            aria-label="ペインを追加"
            title="ペインを追加"
            onClick={onAddPane}
            className="flex h-8 w-8 items-center justify-center rounded text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
