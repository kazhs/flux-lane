import type { HTMLAttributes } from "react";
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
  onReload: () => void;
  onToggleMute: () => void;
  onClose: () => void;
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
  onReload,
  onToggleMute,
  onClose,
  dragHandleProps,
}: PaneHeaderProps) {
  return (
    <div
      className="flex items-center gap-1.5 border-b border-border bg-surface px-2"
      style={{ height: PANE_HEADER_HEIGHT }}
    >
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
