import { useAppStore } from "../../stores/appStore";
import type { WorkspaceId } from "../../types";
import type { NavigateDirection } from "../panes/paneNavigation";

/**
 * `current` の隣（prev / next）の workspaceId を返す純粋関数。端はラップする（巡回）:
 * ブラウザの ⌃⇥ と同じく、末尾で next すると先頭へ戻る。`current` が order に無い / 空なら
 * 先頭を返す（なければ null）。DOM に触れないので単体テスト可能。
 */
export function resolveAdjacentWorkspaceId(
  order: readonly WorkspaceId[],
  current: WorkspaceId | null,
  direction: NavigateDirection,
): WorkspaceId | null {
  if (order.length === 0) return null;
  const currentIndex = current === null ? -1 : order.indexOf(current);
  if (currentIndex === -1) return order[0] ?? null;
  const delta = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + delta + order.length) % order.length;
  return order[nextIndex] ?? null;
}

/**
 * アクティブワークスペースの隣へ切り替える（`app://navigate` の target "workspace" から呼ぶ）。
 * 端はラップする。ワークスペースが無ければ no-op。
 */
export function activateAdjacentWorkspace(direction: NavigateDirection): void {
  const state = useAppStore.getState();
  const workspaceId = resolveAdjacentWorkspaceId(
    state.workspaceOrder,
    state.activeWorkspaceId,
    direction,
  );
  if (!workspaceId) return;
  state.setActiveWorkspace(workspaceId);
}
