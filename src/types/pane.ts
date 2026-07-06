import type { PaneId, SessionId } from "./ids";

export interface Pane {
  id: PaneId;
  title: string;
  url: string;
  sessionId: SessionId;
  /** px。最小 300。新規作成時 = window 幅の 50% を確定値として保存 */
  width: number;
  muted: boolean;
}
