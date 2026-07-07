export const MIN_PANE_WIDTH = 300 as const;
export const DEFAULT_PANE_WIDTH_RATIO = 0.5 as const;
export const PANE_HEADER_HEIGHT = 40 as const;
export const PERSIST_DEBOUNCE_MS = 500 as const;
/** ストリップ下端に確保する帯の高さ(px)。ネイティブ WebView は placeholder の
 * rect にしか重ならないため、この帯だけは常に DOM が透けて横スクロールバーを
 * 隠さない（docs/ARCHITECTURE.md 1.2）。 */
export const PANE_SCROLLBAR_RESERVE_HEIGHT = 15 as const;
