export type WorkspaceTabProps = {
  name: string;
  active: boolean;
  onSelect: () => void;
};

/**
 * active 表示は下線ではなく背景塗り。下線だとペインのフォーカス表示
 * （ヘッダー上端の accent ライン）と隣接して見分けが付かないため。
 */
export function WorkspaceTab({ name, active, onSelect }: WorkspaceTabProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`my-1 rounded px-3 py-0.5 text-sm transition-colors ${
        active
          ? "bg-surface-hover text-text"
          : "text-text-dim hover:bg-surface hover:text-text"
      }`}
    >
      {name}
    </button>
  );
}
