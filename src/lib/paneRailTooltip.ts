/**
 * ペインレールアイテムの native tooltip 文字列を組み立てる。
 * `⌘n {表示名} ({account})` の形式で、ショートカット表記・アカウントは
 * どちらも無ければ省略する。
 */
export function paneRailTooltip(
  displayName: string,
  accountLabel: string | null,
  shortcut: string | null,
): string {
  const prefix = shortcut ? `${shortcut} ` : "";
  const suffix = accountLabel ? ` (${accountLabel})` : "";
  return `${prefix}${displayName}${suffix}`;
}
