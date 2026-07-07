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
 * （`pane_focus.ts` の init script と同じ前提）。
 *
 * X は SPA でプロフィールリンクの描画がページ読み込み完了より遅れることがあり、
 * 一発 DOM チェックだと取り逃がす。そのため `window.__fluxLaneAccountProbeInstalled`
 * で多重インストールを防ぎつつ `setInterval` で常駐監視し、検知値が前回送信値
 * （`window.__fluxLaneLastReportedAccount`）から変わったときだけ
 * `report_pane_account` を invoke する。ログアウトで検知値が null に戻った場合も
 * 送信値なしとして記録するため、同じアカウントへの再ログインでも再送される
 * （ログアウト・アカウント切替への追随）。ナビゲーションで window が再生成される
 * 通常ページ遷移では install ガードも消えるため、`WebviewManager.handlePageLoad`
 * の finished 再 eval で問題なく再インストールされる。
 */
const X_ACCOUNT_PROBE_SCRIPT = `(function () {
  if (window.__fluxLaneAccountProbeInstalled) return;
  window.__fluxLaneAccountProbeInstalled = true;

  var internals = window.__TAURI_INTERNALS__;
  if (!internals || typeof internals.invoke !== "function") return;

  function poll() {
    var link = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    var href = link && link.getAttribute("href");
    var match = href && href.match(/^\\/([^/?#]+)/);
    var handle = match && match[1];
    var label = handle ? "@" + handle : null;

    if (label === window.__fluxLaneLastReportedAccount) return;
    window.__fluxLaneLastReportedAccount = label;
    if (!label) return;

    internals.invoke("report_pane_account", { handle: label }).catch(function () {});
  }

  poll();
  setInterval(poll, 1500);
})();`;

export const PRESET_SERVICES: ServiceDefinition[] = [
  {
    id: "x",
    name: "X",
    url: "https://x.com",
    accountProbeScript: X_ACCOUNT_PROBE_SCRIPT,
  },
];
