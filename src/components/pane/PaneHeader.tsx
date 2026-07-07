import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from "react";
import { PANE_HEADER_HEIGHT } from "../../lib/constants";
import { IconButton } from "../ui/IconButton";
import {
  CloseIcon,
  GripIcon,
  ReloadIcon,
  VolumeIcon,
  VolumeMutedIcon,
} from "../ui/icons";

export type PaneHeaderProps = {
  title: string;
  url: string;
  muted: boolean;
  isLoading: boolean;
  /** ペインフォーカスモデルでこのペインがフォーカス中か。上端に accent ラインを表示する。 */
  focused?: boolean;
  onReload: () => void;
  onToggleMute: () => void;
  onClose: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function PaneHeader({
  title,
  url,
  muted,
  isLoading,
  focused,
  onReload,
  onToggleMute,
  onClose,
  onPointerDown,
  dragHandleProps,
}: PaneHeaderProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="chrome-surface relative flex items-center gap-1.5 border-b border-border px-2"
      style={{ height: PANE_HEADER_HEIGHT }}
    >
      {focused && (
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-accent"
          aria-hidden="true"
        />
      )}
      <span
        {...dragHandleProps}
        className="flex shrink-0 cursor-grab items-center text-text-dim active:cursor-grabbing"
      >
        <GripIcon />
      </span>
      <span className="truncate text-sm font-medium text-text">{title}</span>
      <span className="truncate text-xs text-text-dim">{hostnameOf(url)}</span>
      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <IconButton
          aria-label="Reload"
          icon={<ReloadIcon className={isLoading ? "animate-spin" : ""} />}
          onClick={onReload}
        />
        <IconButton
          aria-label={muted ? "Unmute" : "Mute"}
          icon={muted ? <VolumeMutedIcon /> : <VolumeIcon />}
          active={muted}
          onClick={onToggleMute}
        />
        <IconButton aria-label="Close" icon={<CloseIcon />} onClick={onClose} />
      </div>
    </div>
  );
}
