/**
 * 1 始まりの順序からキーボードショートカット表記を作る（例: `shortcutLabel("⌘", 2)` →
 * `"⌘2"`）。9 を超える順序には割り当てを行わない仕様のため null を返す
 * （呼び出し側は非表示にする）。
 */
export function shortcutLabel(symbol: string, order: number): string | null {
  if (order < 1 || order > 9) return null;
  return `${symbol}${order}`;
}
