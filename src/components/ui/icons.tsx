export type IconProps = {
  size?: number;
  className?: string;
};

const BASE_PROPS = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ReloadIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M13 8a5 5 0 1 1-1.5-3.5" />
      <path d="M13 2.5V5.5H10" />
    </svg>
  );
}

export function VolumeIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M2 6h2.5L9 3v10L4.5 10H2z" />
      <path d="M11 5.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}

export function VolumeMutedIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M2 6h2.5L9 3v10L4.5 10H2z" />
      <path d="M11 6l3 4M14 6l-3 4" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function SettingsIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </svg>
  );
}

export function XIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function PlayIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <path d="M4 2.5v11l9-5.5z" />
    </svg>
  );
}

export function PauseIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <rect x="3.5" y="2.5" width="3" height="11" />
      <rect x="9.5" y="2.5" width="3" height="11" />
    </svg>
  );
}

export function DiscordIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M3 9.5V6.5C3 3.5 5 2 8 2s5 1.5 5 4.5v3c0 1.5-1 2.5-2.5 2.5-.3 0-.5-.2-.5-.5v-.6c-1.3.3-2.7.3-4 0v.6c0 .3-.2.5-.5.5C4 12 3 11 3 9.5Z" />
      <circle cx="6" cy="7.2" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.2" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function InstagramIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="3" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="11.5" cy="4.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThreadsIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...BASE_PROPS}>
      <path d="M10.5 3.5c-3.5-1.5-7 .5-7 4 0 2.8 2 4.5 4.3 4.5 1.8 0 3.2-1 3.2-2.6 0-1.3-1-2.2-2.3-2.2-1 0-1.7.6-1.7 1.5 0 .6.4 1 1 1" />
    </svg>
  );
}

export function FacebookIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <path d="M10.5 2.5h-1c-1.1 0-2 .9-2 2V7H5.5v2h2v5h2V9h1.9l.3-2H9.5V4.8c0-.28.22-.5.5-.5h1.5V2.5Z" />
    </svg>
  );
}

export function GripIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      {...BASE_PROPS}
      strokeWidth={0}
      fill="currentColor"
    >
      <circle cx="5" cy="4" r="1" />
      <circle cx="5" cy="8" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="11" cy="4" r="1" />
      <circle cx="11" cy="8" r="1" />
      <circle cx="11" cy="12" r="1" />
    </svg>
  );
}
