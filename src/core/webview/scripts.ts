/**
 * ペイン内の video/audio 要素を強制的にミュートする init script。
 * `window.__fluxLaneMuted` フラグで冪等にし、動的に追加される要素は MutationObserver で追随する。
 * ナビゲーションで注入済みスクリプトが消えるため、`pane://page-load` finished 時に再 eval する
 * （`WebviewManager` 側の責務）。
 */
export const MUTE_SCRIPT = `(() => {
  if (window.__fluxLaneMuted) return;
  window.__fluxLaneMuted = true;

  const muteAll = () => {
    document.querySelectorAll("video, audio").forEach((el) => {
      el.muted = true;
    });
  };

  muteAll();

  const observer = new MutationObserver(muteAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__fluxLaneMuteObserver = observer;
})();`;

/** MUTE_SCRIPT の逆操作。observer を解除し、既存要素の muted を解除する。 */
export const UNMUTE_SCRIPT = `(() => {
  if (!window.__fluxLaneMuted) return;
  window.__fluxLaneMuted = false;

  if (window.__fluxLaneMuteObserver) {
    window.__fluxLaneMuteObserver.disconnect();
    window.__fluxLaneMuteObserver = undefined;
  }

  document.querySelectorAll("video, audio").forEach((el) => {
    el.muted = false;
  });
})();`;

/**
 * ペインを下方向へ自動スクロールする init script。requestAnimationFrame で
 * 経過時間ベースに位置を進める（speed×20 px/s：x1=20、x2=40、x3=60）。
 * scrollBy に小数を渡すことで tick 間隔ではなくフレームレートで刻み、`setInterval`
 * 実装で発生していた低速時のカクつきを解消する。
 *
 * `window.__fluxLaneAutoScroll` フラグで冪等。ユーザーが wheel / pointerdown / keydown
 * のいずれかを発生させたら 4 秒間ポーズし、その後自動再開する（capture で取得するため
 * ページ側が stopPropagation してもポーズ判定は効く）。
 * ナビゲーションで注入済みスクリプトが消えるため、`pane://page-load` finished 時に再 eval する
 * （`WebviewManager` 側の責務、`MUTE_SCRIPT` と同じパターン）。
 *
 * `speed` は 1|2|3 の整数として文字列化し、そのままスクリプトに埋め込む
 * （呼び出し側は AutoScrollSpeed 型で担保、文字列連結による JS injection の余地は無い）。
 */
export function autoScrollStartScript(speed: 1 | 2 | 3 | 4 | 5): string {
  return `(() => {
  if (window.__fluxLaneAutoScroll) return;

  const PAUSE_MS = 4000;
  const SPEED_PX_PER_SEC = ${speed} * 20;
  const state = { pausedUntil: 0, rafId: 0, lastTs: 0, accum: 0 };

  const tick = (ts) => {
    if (state.lastTs === 0) {
      state.lastTs = ts;
    }
    const dt = ts - state.lastTs;
    state.lastTs = ts;
    if (Date.now() >= state.pausedUntil && dt > 0) {
      // WKWebView は scrollBy に小数を渡すと 0 or 1 に丸めるため、小数分を JS 側で累積し
      // 1px 以上たまったフレームだけ整数を投げる。x1=20px/s は 60fps で 0.33px/frame
      // なので概ね 3 フレームに 1px、x2 は 1〜2 フレームに 1px、x3 は毎フレーム 1px。
      state.accum += (SPEED_PX_PER_SEC * dt) / 1000;
      const px = Math.floor(state.accum);
      if (px > 0) {
        window.scrollBy(0, px);
        state.accum -= px;
      }
    }
    state.rafId = requestAnimationFrame(tick);
  };
  state.rafId = requestAnimationFrame(tick);

  const onUserInteraction = () => {
    state.pausedUntil = Date.now() + PAUSE_MS;
    // pause 明けに dt が跳ねて一気に飛ぶのを防ぐ: 再開時に lastTs と accum を再取得させる。
    state.lastTs = 0;
    state.accum = 0;
  };
  const listenerOptions = { capture: true, passive: true };
  window.addEventListener("wheel", onUserInteraction, listenerOptions);
  window.addEventListener("pointerdown", onUserInteraction, listenerOptions);
  window.addEventListener("keydown", onUserInteraction, listenerOptions);

  window.__fluxLaneAutoScroll = { state, onUserInteraction, listenerOptions };
})();`;
}

/** {@link autoScrollStartScript} の逆操作。RAF ループとイベントリスナーを解除する。 */
export const AUTO_SCROLL_STOP_SCRIPT = `(() => {
  if (!window.__fluxLaneAutoScroll) return;

  const { state, onUserInteraction, listenerOptions } = window.__fluxLaneAutoScroll;
  cancelAnimationFrame(state.rafId);
  window.removeEventListener("wheel", onUserInteraction, listenerOptions);
  window.removeEventListener("pointerdown", onUserInteraction, listenerOptions);
  window.removeEventListener("keydown", onUserInteraction, listenerOptions);
  window.__fluxLaneAutoScroll = undefined;
})();`;
