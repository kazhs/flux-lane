/**
 * プリセットサービス追加時のタイトルを決める純関数。同名ペインが無ければ baseName の
 * ままとし、既にあれば "baseName 2", "baseName 3" ... と衝突しない番号を付ける。
 */
export function nextServiceTitle(
  existingTitles: readonly string[],
  baseName: string,
): string {
  if (!existingTitles.includes(baseName)) return baseName;

  let n = 2;
  while (existingTitles.includes(`${baseName} ${n}`)) {
    n += 1;
  }
  return `${baseName} ${n}`;
}
