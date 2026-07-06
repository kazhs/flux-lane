import { describe, expect, it, beforeEach } from "vitest";
import { useAppStore } from "../appStore";
import { selectActivePaneIds } from "../selectors";
import { createDefaultPersistedState } from "../../lib/defaults";

describe("selectActivePaneIds", () => {
  beforeEach(() => {
    useAppStore.getState().hydrate(createDefaultPersistedState());
  });

  it("状態が変わらない限り同一参照を返す（React セレクタとして安全）", () => {
    const s = useAppStore.getState();
    expect(selectActivePaneIds(s)).toBe(selectActivePaneIds(s));

    // ペイン追加後も、同一状態に対しては同一参照
    const workspaceId = s.activeWorkspaceId;
    if (!workspaceId) throw new Error("not hydrated");
    useAppStore
      .getState()
      .addPane(workspaceId, { title: "X", url: "https://x.com", width: 400 });
    const next = useAppStore.getState();
    expect(selectActivePaneIds(next)).toBe(selectActivePaneIds(next));
  });

  it("active workspace の paneIds を順序どおり返し、無関係な更新では参照が変わらない", () => {
    const workspaceId = useAppStore.getState().activeWorkspaceId;
    if (!workspaceId) throw new Error("not hydrated");
    const a = useAppStore
      .getState()
      .addPane(workspaceId, { title: "A", url: "https://a.test", width: 400 });
    const b = useAppStore
      .getState()
      .addPane(workspaceId, { title: "B", url: "https://b.test", width: 400 });
    expect(selectActivePaneIds(useAppStore.getState())).toEqual([a, b]);

    const before = selectActivePaneIds(useAppStore.getState());
    useAppStore.getState().updateSettings({ defaultPaneWidthRatio: 0.4 });
    expect(selectActivePaneIds(useAppStore.getState())).toBe(before);
  });
});
