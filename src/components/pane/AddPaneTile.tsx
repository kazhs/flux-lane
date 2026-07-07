import { PlusIcon } from "../ui/icons";

export type AddPaneTileProps = {
  onClick: () => void;
};

/**
 * ストリップ右端のペイン追加タイル。chrome 面の中で最も明るいトーン + accent 縁で
 * 「クリックできる領域」であることを一目で示す。
 */
export function AddPaneTile({ onClick }: AddPaneTileProps) {
  return (
    <button
      type="button"
      aria-label="Add pane"
      onClick={onClick}
      className="flex h-full w-12 shrink-0 items-center justify-center border-r border-l border-border-strong bg-surface-hover text-accent transition-[filter] hover:brightness-125"
    >
      <PlusIcon size={20} />
    </button>
  );
}
