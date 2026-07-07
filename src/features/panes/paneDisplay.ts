import type { ServiceDefinition } from "../../core/services";
import { matchServiceByUrl } from "../../lib/matchServiceByUrl";

/**
 * レールに表示するペインの名前を決める。URL が既知サービス（`services`）に
 * マッチすればそのサービス名（例: "X"。衝突回避用の連番タイトルは使わない）、
 * しなければ pane のタイトルをそのまま使う。
 */
export function resolvePaneDisplayName(
  url: string,
  fallbackTitle: string,
  services: readonly ServiceDefinition[],
): string {
  return matchServiceByUrl(url, services)?.name ?? fallbackTitle;
}
