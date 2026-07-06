import type { ReactNode } from "react";

export type ServicePresetTileProps = {
  name: string;
  icon: ReactNode;
  onClick: () => void;
};

export function ServicePresetTile({
  name,
  icon,
  onClick,
}: ServicePresetTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-3 text-text-dim transition-colors hover:bg-surface-hover hover:text-text"
    >
      {icon}
      <span className="text-xs font-medium">{name}</span>
    </button>
  );
}
