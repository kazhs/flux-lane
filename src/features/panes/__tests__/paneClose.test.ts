import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore, type AppStore } from "../../../stores/appStore";
import { useUiStore, type UiStore } from "../../../stores/uiStore";
import { createDefaultPersistedState } from "../../../lib/defaults";
import { confirmDialog } from "../../../core/ipc/dialog";
import { closePaneWithConfirm } from "../paneClose";

vi.mock("../../../core/ipc/dialog", () => ({
  confirmDialog: vi.fn(),
}));

const mockedConfirmDialog = vi.mocked(confirmDialog);
const INITIAL_APP_STATE: AppStore = useAppStore.getState();
const INITIAL_UI_STATE: UiStore = useUiStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_APP_STATE, true);
  useUiStore.setState(INITIAL_UI_STATE, true);
  mockedConfirmDialog.mockReset();
});

function addPaneWithRuntime() {
  useAppStore.getState().hydrate(createDefaultPersistedState());
  const workspaceId = useAppStore.getState().activeWorkspaceId;
  if (!workspaceId) throw new Error("expected active workspace to be set");
  const paneId = useAppStore.getState().addPane(workspaceId, {
    title: "Test Pane",
    url: "https://example.com",
    width: 400,
  });
  useUiStore.getState().setPaneLoading(paneId, true);
  return { paneId, workspaceId };
}

describe("closePaneWithConfirm", () => {
  it("removes the pane and its runtime state when confirmed", async () => {
    const { paneId, workspaceId } = addPaneWithRuntime();
    mockedConfirmDialog.mockResolvedValue(true);

    await closePaneWithConfirm(paneId, "Test Pane");

    expect(mockedConfirmDialog).toHaveBeenCalledWith(
      "「Test Pane」を閉じる？セッションも削除される",
    );
    expect(useAppStore.getState().panes[paneId]).toBeUndefined();
    expect(
      useAppStore.getState().workspaces[workspaceId]?.paneIds,
    ).not.toContain(paneId);
    expect(useUiStore.getState().paneRuntime[paneId]).toBeUndefined();
  });

  it("does nothing when the confirmation is declined", async () => {
    const { paneId } = addPaneWithRuntime();
    mockedConfirmDialog.mockResolvedValue(false);

    await closePaneWithConfirm(paneId, "Test Pane");

    expect(useAppStore.getState().panes[paneId]).toBeDefined();
    expect(useUiStore.getState().paneRuntime[paneId]).toBeDefined();
  });
});
