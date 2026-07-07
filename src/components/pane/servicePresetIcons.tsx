import type { ComponentType, ReactNode } from "react";
import {
  XIcon,
  DiscordIcon,
  InstagramIcon,
  ThreadsIcon,
  FacebookIcon,
  type IconProps,
} from "../ui/icons";
import { PRESET_SERVICES } from "../../core/services";
import { matchServiceByUrl } from "../../lib/matchServiceByUrl";

/** core/services.ts の ServiceDefinition.id → アイコン。core に React を持ち込まないための境界。 */
export const SERVICE_PRESET_ICONS: Record<string, ComponentType<IconProps>> = {
  x: XIcon,
  discord: DiscordIcon,
  instagram: InstagramIcon,
  threads: ThreadsIcon,
  facebook: FacebookIcon,
};

/**
 * `url` の hostname が既知サービス（`PRESET_SERVICES`）と一致したらそのアイコンを返す。
 * 一致しなければ null（呼び出し側でフォールバック表示に切り替える）。
 */
export function iconForUrl(url: string): ReactNode | null {
  const service = matchServiceByUrl(url, PRESET_SERVICES);
  if (!service) return null;

  const Icon = SERVICE_PRESET_ICONS[service.id];
  if (!Icon) return null;

  return <Icon />;
}
