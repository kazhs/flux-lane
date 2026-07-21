import type { PaneId, SessionId } from "./ids";

/** オートスクロールの速度倍率。1 = 20px/s (base)、2 = 40、3 = 60、4 = 80、5 = 100 px/s。
 * `autoScrollStartScript` が RAF 経過時間から px/frame を算出する係数として使う。 */
export type AutoScrollSpeed = 1 | 2 | 3 | 4 | 5;

export interface Pane {
  id: PaneId;
  title: string;
  url: string;
  sessionId: SessionId;
  /** px。最小 300。新規作成時 = window 幅の 50% を確定値として保存 */
  width: number;
  muted: boolean;
  autoScroll: boolean;
  autoScrollSpeed: AutoScrollSpeed;
}
