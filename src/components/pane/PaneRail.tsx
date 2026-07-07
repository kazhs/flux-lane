import type { MouseEvent, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PaneId } from "../../types";
import { paneRailTooltip } from "../../lib/paneRailTooltip";
import { PlusIcon } from "../ui/icons";

export type PaneRailItem = {
  paneId: PaneId;
  /** tooltip 用の表示名。既知サービスにマッチする場合はサービス名、しなければ
   * pane のタイトル（`paneDisplay.resolvePaneDisplayName` で解決済み）。 */
  title: string;
  /** サービスの `accountProbeScript` が検知したログイン中アカウントのハンドル。
   * 未検知・非対応サービスは null（アイコンのみ表示）。 */
  accountLabel: string | null;
  /** アクティブ workspace 内の順序（1 始まり）から算出した「⌘n」表記。
   * 10 番目以降は割り当てなしのため null（バッジ非表示・tooltip でも省略）。 */
  shortcut: string | null;
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

type PaneRailButtonProps = {
  item: PaneRailItem;
  onSelect: (paneId: PaneId) => void;
  onContextMenu: (paneId: PaneId, event: MouseEvent) => void;
};

/**
 * レール 1 アイテム分。dnd-kit の sortable として並び替え可能にする（呼び出し元の
 * `PaneRailContainer` が `SortableContext` を提供する）。ドラッグとクリック（ジャンプ）は
 * 同じ button 要素に listeners を付けて共存させる: `PointerSensor` の
 * activationConstraint distance が閾値なので、単純クリックはドラッグ判定されない。
 * 右クリック（`onContextMenu`）も同様に共存する（dnd-kit の `PointerSensor` は
 * `event.button !== 0` を弾くため、右クリックはそもそもドラッグ起動しない）。
 */
function PaneRailButton({
  item,
  onSelect,
  onContextMenu,
}: PaneRailButtonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.paneId });

  return (
    <div
      ref={setNodeRef}
      className="flex justify-center"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title={paneRailTooltip(item.title, item.accountLabel, item.shortcut)}
        onClick={() => onSelect(item.paneId)}
        onContextMenu={(event) => onContextMenu(item.paneId, event)}
        className={`group relative flex w-10 flex-col items-center justify-center gap-0.5 rounded px-1 py-1.5 text-text-dim transition-colors hover:bg-surface-hover hover:text-text ${
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
        {item.shortcut && (
          <span className="w-full truncate text-center text-[9px] leading-none text-text-dim transition-colors group-hover:text-text">
            {item.shortcut}
          </span>
        )}
      </button>
    </div>
  );
}

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
      className="chrome-surface flex h-full shrink-0 flex-col overflow-y-auto border-r border-border"
      style={{ width: RAIL_WIDTH, scrollbarWidth: "none" }}
    >
      <div className="flex flex-col gap-1 pt-2">
        {items.map((item) => (
          <PaneRailButton
            key={item.paneId}
            item={item}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
          />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            aria-label="ペインを追加"
            title="ペインを追加"
            onClick={onAddPane}
            className="flex h-8 w-8 items-center justify-center rounded text-accent-bright transition-colors hover:bg-surface-hover"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
