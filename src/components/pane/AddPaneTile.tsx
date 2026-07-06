import { PlusIcon } from "../ui/icons";

export type AddPaneTileProps = {
  onClick: () => void;
};

export function AddPaneTile({ onClick }: AddPaneTileProps) {
  return (
    <button
      type="button"
      aria-label="Add pane"
      onClick={onClick}
      className="flex h-full w-12 shrink-0 items-center justify-center border-r border-border text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
    >
      <PlusIcon size={18} />
    </button>
  );
}
