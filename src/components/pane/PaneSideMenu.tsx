import { IconButton } from "../ui/IconButton";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  ReloadIcon,
  VolumeIcon,
  VolumeMutedIcon,
} from "../ui/icons";

export type PaneSideMenuProps = {
  autoScroll: boolean;
  muted: boolean;
  isLoading: boolean;
  onReload: () => void;
  onToggleAutoScroll: () => void;
  onToggleMute: () => void;
  onClose: () => void;
};

/**
 * ペイン左端の縦ストリップ（幅 28px）。アクション系（リロード・ミュート・
 * オートスクロール・削除）はすべてここに集約する（ヘッダーは表示専用）。
 * `PanePlaceholder` の外側の兄弟として配置することで、WebView bounds
 * （placeholder の bodyRef rect 由来、`LayoutController` 参照）と重ならない。
 */
export function PaneSideMenu({
  autoScroll,
  muted,
  isLoading,
  onReload,
  onToggleAutoScroll,
  onToggleMute,
  onClose,
}: PaneSideMenuProps) {
  return (
    <div className="chrome-surface flex h-full w-7 shrink-0 flex-col items-center gap-0.5 border-r border-border py-1">
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
      <IconButton
        aria-label={autoScroll ? "Pause auto scroll" : "Start auto scroll"}
        icon={autoScroll ? <PauseIcon /> : <PlayIcon />}
        active={autoScroll}
        onClick={onToggleAutoScroll}
      />
      <div className="flex-1" />
      <IconButton aria-label="Close" icon={<CloseIcon />} onClick={onClose} />
    </div>
  );
}
