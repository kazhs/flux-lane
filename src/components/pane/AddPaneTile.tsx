import { PlusIcon } from "../ui/icons";

export type AddPaneTileProps = {
  onClick: () => void;
};

/** ストリップ右端のペイン追加タイル。accent の + アイコンでクリック領域を示す。 */
export function AddPaneTile({ onClick }: AddPaneTileProps) {
  return (
    <button
      type="button"
      aria-label="Add pane"
      onClick={onClick}
      className="flex h-full w-12 shrink-0 items-center justify-center text-accent transition-colors hover:bg-surface-hover"
    >
      <PlusIcon size={20} />
    </button>
  );
}
