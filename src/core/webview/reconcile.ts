import type { PaneId, SessionId } from "../../types";

export interface DesiredPane {
  paneId: PaneId;
  url: string;
  sessionId: SessionId;
}

export interface WebviewOp {
  paneId: PaneId;
  url: string;
  sessionId: SessionId;
}

export interface WebviewOpsDiff {
  creates: WebviewOp[];
  destroys: PaneId[];
}

/**
 * 現在生成済みの webview 集合（`paneId -> 生成時の sessionId`）と、あるべき状態（`desired`）を
 * 比較し、create/destroy すべき差分を求める純関数。
 *
 * - `desired` に無いが `current` にある → destroy（workspace 切替による suspend、または削除）
 * - `desired` にあるが `current` に無い → create
 * - 両方にあるが sessionId が変わっている → destroy してから create（データストアが変わるため
 *   既存 webview を使い回せない）
 */
export function computeWebviewOps(
  current: ReadonlyMap<PaneId, string>,
  desired: readonly DesiredPane[],
): WebviewOpsDiff {
  const desiredIds = new Set(desired.map((pane) => pane.paneId));
  const creates: WebviewOp[] = [];
  const destroys: PaneId[] = [];

  for (const pane of desired) {
    const currentSessionId = current.get(pane.paneId);
    if (currentSessionId === undefined) {
      creates.push({
        paneId: pane.paneId,
        url: pane.url,
        sessionId: pane.sessionId,
      });
      continue;
    }
    if (currentSessionId !== pane.sessionId) {
      destroys.push(pane.paneId);
      creates.push({
        paneId: pane.paneId,
        url: pane.url,
        sessionId: pane.sessionId,
      });
    }
  }

  for (const paneId of current.keys()) {
    if (!desiredIds.has(paneId)) {
      destroys.push(paneId);
    }
  }

  return { creates, destroys };
}
