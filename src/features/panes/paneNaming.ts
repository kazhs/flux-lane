/**
 * プリセットサービス追加時のタイトルを決める純関数。常に baseName をそのまま返す
 * （同名ペインが既にあっても "baseName 2" 等の連番は付けない）。
 */
export function nextServiceTitle(baseName: string): string {
  return baseName;
}
