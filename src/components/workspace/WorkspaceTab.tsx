export type WorkspaceTabProps = {
  name: string;
  active: boolean;
  onSelect: () => void;
};

export function WorkspaceTab({ name, active, onSelect }: WorkspaceTabProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-full border-b-2 px-3 text-sm transition-colors ${
        active
          ? "border-accent text-text"
          : "border-transparent text-text-dim hover:text-text"
      }`}
    >
      {name}
    </button>
  );
}
