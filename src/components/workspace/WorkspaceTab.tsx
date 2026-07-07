import { useRef, type KeyboardEvent, type MouseEvent } from "react";

export type WorkspaceTabProps = {
  name: string;
  active: boolean;
  /** workspaceOrder 内の順序（1 始まり）から算出した「⌃n」表記。10 番目以降は
   * 割り当てなしのため null（2 行目非表示）。 */
  shortcut: string | null;
  /** ネイティブコンテキストメニューの「名前を変更」で入ったインライン編集モード。
   * true の間はボタンではなくテキスト input を表示する。 */
  editing: boolean;
  onSelect: () => void;
  onContextMenu: (event: MouseEvent) => void;
  /** 空文字以外の確定入力。Enter または blur で呼ぶ。 */
  onRenameSubmit: (name: string) => void;
  onRenameCancel: () => void;
};

/**
 * active 表示は下線ではなく背景塗り。下線だとペインのフォーカス表示
 * （ヘッダー上端の accent ライン）と隣接して見分けが付かないため。
 * 削除操作はネイティブコンテキストメニュー経由（`onContextMenu`）のみ
 * （`PaneRail` のレールアイテムと同じ方針）。
 * 非編集時はワークスペース名 + ショートカット表記（`⌃n`）の 2 行表示
 * （`PaneRail` のアカウント名 + ショートカット表記と同じ縦積みパターン）。
 */
export function WorkspaceTab({
  name,
  active,
  shortcut,
  editing,
  onSelect,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: WorkspaceTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Enter/Escape が確定・キャンセルを処理した後、unmount に伴う blur が二重発火しても
  // 無視するためのガード。input が autoFocus で mount されるたびに onFocus で再度 false に
  // 戻す（この ref は WorkspaceTab 自体は unmount しないため editing の再突入ごとに
  // リセットする必要がある）。
  const settledRef = useRef(false);

  if (editing) {
    const commit = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      const value = inputRef.current?.value.trim() ?? "";
      if (!value) {
        onRenameCancel();
        return;
      }
      onRenameSubmit(value);
    };
    const cancel = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      onRenameCancel();
    };

    return (
      <input
        ref={inputRef}
        autoFocus
        defaultValue={name}
        onFocus={() => {
          settledRef.current = false;
        }}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className="my-1 w-24 rounded border border-accent bg-surface px-2 py-0.5 text-sm text-text outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`flex flex-col items-center justify-center rounded px-3 py-1 text-sm transition-colors ${
        active
          ? "bg-surface-hover text-text"
          : "text-text-dim hover:bg-surface hover:text-text"
      }`}
    >
      <span className="leading-tight">{name}</span>
      {shortcut && (
        <span className="text-[9px] leading-none text-text-dim">
          {shortcut}
        </span>
      )}
    </button>
  );
}
