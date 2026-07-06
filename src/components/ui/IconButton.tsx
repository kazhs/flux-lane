import type { ReactNode, MouseEventHandler } from "react";

export type IconButtonProps = {
  icon: ReactNode;
  "aria-label": string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  active?: boolean;
  className?: string;
};

export function IconButton({
  icon,
  "aria-label": ariaLabel,
  onClick,
  disabled = false,
  active = false,
  className = "",
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-6 w-6 items-center justify-center rounded text-text-dim transition-colors hover:bg-surface-hover hover:text-text active:bg-border disabled:pointer-events-none disabled:opacity-40 ${active ? "bg-surface-hover text-accent" : ""} ${className}`}
    >
      {icon}
    </button>
  );
}
