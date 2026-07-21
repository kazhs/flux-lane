import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../../stores/appStore";
import { createDefaultPersistedState } from "../../../lib/defaults";

vi.mock("../../ipc/commands", () => ({
  createPaneWebview: vi.fn(),
  destroyPaneWebview: vi.fn(),
  listPaneWebviewLabels: vi.fn().mockResolvedValue([]),
  setPaneBounds: vi.fn(),
  setPaneVisible: vi.fn(),
  reloadPane: vi.fn(),
  evalInPane: vi.fn(),
  focusWebview: vi.fn(),
}));
vi.mock("../../ipc/events", () => ({
  onPanePageLoad: vi.fn().mockResolvedValue(() => {}),
  onPanePointerDown: vi.fn().mockResolvedValue(() => {}),
  onPaneWheel: vi.fn().mockResolvedValue(() => {}),
  onPaneAccount: vi.fn().mockResolvedValue(() => {}),
}));

import { createPaneWebview, destroyPaneWebview } from "../../ipc/commands";
import { webviewManager } from "../WebviewManager";

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

/**
 * code review High #2 の regression test: reconcile が並行実行されると同一ペインへの
 * create 二重発行 → 誤 failed 登録 → 生きている webview の destroy が起きる。
 * 直列化ゲート導入後は「ペインごとに create ちょうど 1 回・destroy ゼロ」になる。
 */
describe("WebviewManager reconcile serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // WebviewManager は viewport 補正のため window.innerHeight を参照する（node 環境には無い）。
    vi.stubGlobal("window", { innerHeight: 800 });
    // appHidden 判定と visibilitychange 購読で document を触るため最低限のスタブを置く。
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("create の解決前に store が再度更新されても、create はペインごとに 1 回で destroy は発生しない", async () => {
    const pending: Deferred[] = [];
    vi.mocked(createPaneWebview).mockImplementation(() => {
      const d = deferred();
      pending.push(d);
      return d.promise;
    });
    vi.mocked(destroyPaneWebview).mockResolvedValue(undefined);

    useAppStore.getState().hydrate(createDefaultPersistedState());
    const workspaceId = useAppStore.getState().activeWorkspaceId;
    if (!workspaceId) throw new Error("not hydrated");

    await webviewManager.init();
    await flushMicrotasks();

    // 1 つ目の addPane → reconcile 開始（create は未解決のまま保留）
    useAppStore
      .getState()
      .addPane(workspaceId, { title: "A", url: "https://a.test", width: 400 });
    await flushMicrotasks();
    expect(pending.length).toBe(1);

    // create が in-flight のうちに 2 つ目を追加（旧実装では並行 reconcile が走った）
    useAppStore
      .getState()
      .addPane(workspaceId, { title: "B", url: "https://b.test", width: 400 });
    await flushMicrotasks();
    // 直列化されていれば 2 回目の create はまだ発行されない
    expect(pending.length).toBe(1);

    pending[0]?.resolve();
    await flushMicrotasks();
    expect(pending.length).toBe(2);
    pending[1]?.resolve();
    await flushMicrotasks();

    // ペインごとにちょうど 1 回の create、destroy はゼロ
    const createdLabels = vi
      .mocked(createPaneWebview)
      .mock.calls.map((call) => call[0].label);
    expect(createdLabels.length).toBe(2);
    expect(new Set(createdLabels).size).toBe(2);
    expect(vi.mocked(destroyPaneWebview)).not.toHaveBeenCalled();

    webviewManager.stop();
  });
});
