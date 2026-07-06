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
