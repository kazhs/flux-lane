import type { AutoScrollSpeed } from "../../types";
import { IconButton } from "../ui/IconButton";
import {
  PauseIcon,
  PlayIcon,
  ReloadIcon,
  VolumeIcon,
  VolumeMutedIcon,
} from "../ui/icons";

export type PaneSideMenuProps = {
  autoScroll: boolean;
  autoScrollSpeed: AutoScrollSpeed;
  muted: boolean;
  isLoading: boolean;
  onReload: () => void;
  onToggleAutoScroll: () => void;
  onCycleAutoScrollSpeed: () => void;
  onToggleMute: () => void;
};

/**
 * ペイン左端の縦ストリップ（幅 28px）。リロード・ミュート・オートスクロールを集約する
 * （ナビゲーション・閉じるはヘッダー右端 `PaneHeader` の担当）。
 * `PanePlaceholder` の外側の兄弟として配置することで、WebView bounds
 * （placeholder の bodyRef rect 由来、`LayoutController` 参照）と重ならない。
 */
export function PaneSideMenu({
  autoScroll,
  autoScrollSpeed,
  muted,
  isLoading,
  onReload,
  onToggleAutoScroll,
  onCycleAutoScrollSpeed,
  onToggleMute,
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
        className={autoScroll ? "!text-accent" : ""}
      />
      <IconButton
        aria-label={`Auto scroll speed: x${autoScrollSpeed} (click to cycle)`}
        icon={
          <span className="text-[10px] font-semibold">{`x${autoScrollSpeed}`}</span>
        }
        active={autoScroll && autoScrollSpeed > 1}
        onClick={onCycleAutoScrollSpeed}
      />
    </div>
  );
}
