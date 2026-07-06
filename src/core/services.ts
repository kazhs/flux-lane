/** ペイン追加時にワンクリックで使える既知サービスの定義（docs/ARCHITECTURE.md 1.9 の前倒し）。
 * React を持ち込まないため、id → アイコンのマッピングは components 側に置く。 */
export interface ServiceDefinition {
  id: string;
  name: string;
  url: string;
}

export const PRESET_SERVICES: ServiceDefinition[] = [
  { id: "x", name: "X", url: "https://x.com" },
];
