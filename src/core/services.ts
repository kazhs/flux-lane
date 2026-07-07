/** ペイン追加時にワンクリックで使える既知サービスの定義（docs/ARCHITECTURE.md 1.9 の前倒し）。
 * React を持ち込まないため、id → アイコンのマッピングは components 側に置く。 */
export interface ServiceDefinition {
  id: string;
  name: string;
  url: string;
  /** ペインへの `evalInPane` で注入する、ログイン中アカウントのハンドル検知用 init script。
   * `report_pane_account` invoke 経由でレールへ表示するラベルを Rust 側に通知する
   * （`WebviewManager.handlePageLoad` が finished 時に注入する）。 */
  accountProbeScript?: string;
}

/**
 * X（旧 Twitter）のログイン済み DOM からハンドルを取る probe script。IIFE。
 * `window.__TAURI_INTERNALS__.invoke` が無い環境（remote IPC 不成立）では何もしない
 * （`pane_focus.ts` の init script と同じ前提）。同じハンドルの再送は
 * `window.__fluxLaneLastReportedAccount` で抑止する（ナビゲーションで消えるため
 * finished 時の再 eval ごとに 1 回送るだけになる）。
 */
const X_ACCOUNT_PROBE_SCRIPT = `(function () {
  var internals = window.__TAURI_INTERNALS__;
  if (!internals || typeof internals.invoke !== "function") return;

  var link = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  var href = link && link.getAttribute("href");
  var match = href && href.match(/^\\/([^/?#]+)/);
  var handle = match && match[1];
  if (!handle) return;

  var label = "@" + handle;
  if (window.__fluxLaneLastReportedAccount === label) return;
  window.__fluxLaneLastReportedAccount = label;

  internals.invoke("report_pane_account", { handle: label }).catch(function () {});
})();`;

export const PRESET_SERVICES: ServiceDefinition[] = [
  {
    id: "x",
    name: "X",
    url: "https://x.com",
    accountProbeScript: X_ACCOUNT_PROBE_SCRIPT,
  },
];
