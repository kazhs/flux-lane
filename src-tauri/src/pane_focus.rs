//! ペインフォーカスモデルの initialization script。
//!
//! 未フォーカスのペイン webview 上では pointerdown/mousedown/click/dblclick/contextmenu と
//! wheel を capture phase で奪い、フォーカス取得（1 クリック目）または app への横スクロール
//! 転送（wheel）に置き換える。フォーカス済みなら何もせず通常のページ動作に委ねる。
//!
//! `window.__TAURI_INTERNALS__.invoke` が無い環境（remote IPC 不成立）では何もしない
//! （ブロッキングだけ有効になって操作不能になる事態を避ける）。
pub const PANE_FOCUS_INIT_SCRIPT: &str = r#"(function () {
  if (window.__fluxLanePaneFocusInstalled) return;
  window.__fluxLanePaneFocusInstalled = true;

  var internals = window.__TAURI_INTERNALS__;
  if (!internals || typeof internals.invoke !== "function") return;
  var invoke = internals.invoke;

  var focused = false;
  var focusRequested = false;
  // 未フォーカス状態で始まったクリックジェスチャは、途中で focused が true に
  // なっても（app の確認 eval は押下中に届き得る）最後までブロックする。
  // focused フラグだけを見る方式は pointerdown〜click の間の状態変化で必ず破れる。
  var swallowGesture = false;

  window.__fluxLaneSetFocused = function (value) {
    focused = Boolean(value);
    focusRequested = false;
  };

  function block(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function blockIfNeeded(event) {
    if (focused && !swallowGesture) return;
    block(event);
  }

  window.addEventListener(
    "pointerdown",
    function (event) {
      if (focused) {
        swallowGesture = false;
        return;
      }
      swallowGesture = true;
      block(event);
      if (!focusRequested) {
        focusRequested = true;
        invoke("notify_pane_pointer_down", {}).catch(function () {
          focusRequested = false;
        });
      }
    },
    { capture: true, passive: false },
  );

  ["pointerup", "mousedown", "mouseup", "auxclick", "dblclick", "contextmenu"].forEach(
    function (type) {
      window.addEventListener(type, blockIfNeeded, {
        capture: true,
        passive: false,
      });
    },
  );

  // click はジェスチャの終端。飲み込み対象ならここでブロックして解除する。
  window.addEventListener(
    "click",
    function (event) {
      if (focused && !swallowGesture) return;
      block(event);
      swallowGesture = false;
    },
    { capture: true, passive: false },
  );

  window.addEventListener(
    "pointercancel",
    function () {
      swallowGesture = false;
    },
    { capture: true },
  );

  window.addEventListener(
    "wheel",
    function (event) {
      if (focused) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      // rAF バッチせず即転送する。バッチは最大 1 フレームの遅延と入力のクランプを生み、
      // 受信側の慣性補間と合わせてもネイティブスクロールとの体感差が大きくなる。
      invoke("forward_pane_wheel", {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
      }).catch(function () {});
    },
    { capture: true, passive: false },
  );

  // IPC 疎通 ping: app 側は delta 0,0 を無視するだけで良い。Rust 側で受信ログを出す。
  invoke("forward_pane_wheel", { deltaX: 0, deltaY: 0 }).catch(function () {});
})();"#;
