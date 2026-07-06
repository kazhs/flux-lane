import type { PaneId } from "../../types";

const PANE_LABEL_PREFIX = "pane-";

/** ペイン ID から webview label を決める（規約: `pane-${paneId}`）。 */
export function labelForPane(paneId: PaneId): string {
  return `${PANE_LABEL_PREFIX}${paneId}`;
}

/** webview label からペイン ID を逆引きする。規約外の label は null。 */
export function paneIdFromLabel(label: string): PaneId | null {
  if (!label.startsWith(PANE_LABEL_PREFIX)) return null;
  return label.slice(PANE_LABEL_PREFIX.length);
}
