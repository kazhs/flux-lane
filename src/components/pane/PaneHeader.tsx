import type { HTMLAttributes } from "react";
import { PANE_HEADER_HEIGHT } from "../../lib/constants";
import { IconButton } from "../ui/IconButton";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  GripIcon,
} from "../ui/icons";

export type PaneHeaderProps = {
  title: string;
  url: string;
  /** ログイン中アカウント（例: "@kazhs"）。検出済みの場合のみタイトル横に表示する。 */
  accountLabel?: string | null;
  /** ペインフォーカスモデルでこのペインがフォーカス中か。上端に accent ラインを表示する。 */
  focused?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  onBack?: () => void;
  onForward?: () => void;
  onClose?: () => void;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * ペイン上部の表示専用バー（グリップ・タイトル・アカウント・ホスト名・フォーカスライン）。
 * アクション系ボタンは `PaneSideMenu` に集約されている。
 */
export function PaneHeader({
  title,
  url,
  accountLabel,
  focused,
  dragHandleProps,
  onBack,
  onForward,
  onClose,
}: PaneHeaderProps) {
  return (
    <div
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
      {accountLabel && (
        <span className="shrink-0 truncate text-xs text-accent">
          {accountLabel}
        </span>
      )}
      <span className="truncate text-xs text-text-dim">{hostnameOf(url)}</span>
      <div className="flex-1" />
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          aria-label="Back"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
        />
        <IconButton
          aria-label="Forward"
          icon={<ChevronRightIcon />}
          onClick={onForward}
        />
        <IconButton aria-label="Close" icon={<CloseIcon />} onClick={onClose} />
      </div>
    </div>
  );
}
