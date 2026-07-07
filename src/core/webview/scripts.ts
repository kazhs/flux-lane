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
 * ペインを 20px/s（50ms ごとに 1px）で下方向へ自動スクロールする init script。
 * `window.__fluxLaneAutoScroll` フラグで冪等にする。ユーザーが wheel / pointerdown / keydown
 * のいずれかを発生させたら 4 秒間ポーズし、その後自動再開する（capture で取得するため
 * ページ側が stopPropagation してもポーズ判定は効く）。
 * ナビゲーションで注入済みスクリプトが消えるため、`pane://page-load` finished 時に再 eval する
 * （`WebviewManager` 側の責務、`MUTE_SCRIPT` と同じパターン）。
 */
export const AUTO_SCROLL_START_SCRIPT = `(() => {
  if (window.__fluxLaneAutoScroll) return;

  const PAUSE_MS = 4000;
  const state = { pausedUntil: 0 };

  const intervalId = setInterval(() => {
    if (Date.now() < state.pausedUntil) return;
    window.scrollBy(0, 1);
  }, 50);

  const onUserInteraction = () => {
    state.pausedUntil = Date.now() + PAUSE_MS;
  };
  const listenerOptions = { capture: true, passive: true };
  window.addEventListener("wheel", onUserInteraction, listenerOptions);
  window.addEventListener("pointerdown", onUserInteraction, listenerOptions);
  window.addEventListener("keydown", onUserInteraction, listenerOptions);

  window.__fluxLaneAutoScroll = { intervalId, onUserInteraction, listenerOptions };
})();`;

/** AUTO_SCROLL_START_SCRIPT の逆操作。interval とイベントリスナーを解除する。 */
export const AUTO_SCROLL_STOP_SCRIPT = `(() => {
  if (!window.__fluxLaneAutoScroll) return;

  const { intervalId, onUserInteraction, listenerOptions } = window.__fluxLaneAutoScroll;
  clearInterval(intervalId);
  window.removeEventListener("wheel", onUserInteraction, listenerOptions);
  window.removeEventListener("pointerdown", onUserInteraction, listenerOptions);
  window.removeEventListener("keydown", onUserInteraction, listenerOptions);
  window.__fluxLaneAutoScroll = undefined;
})();`;
