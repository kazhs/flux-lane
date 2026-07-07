import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPersistedState } from "../../../lib/defaults";
import { useAppStore, type AppStore } from "../../../stores/appStore";
import { importConfigFile } from "../../ipc/commands";
import { openFileDialog } from "../../ipc/dialog";
import { importConfig } from "../importConfig";

vi.mock("../../ipc/commands", () => ({
  importConfigFile: vi.fn(),
}));
vi.mock("../../ipc/dialog", () => ({
  openFileDialog: vi.fn(),
}));

const mockedImportConfigFile = vi.mocked(importConfigFile);
const mockedOpenFileDialog = vi.mocked(openFileDialog);
const INITIAL_STATE: AppStore = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  mockedImportConfigFile.mockReset();
  mockedOpenFileDialog.mockReset();
});

describe("importConfig", () => {
  it("returns cancelled and does not touch the store when the open dialog is cancelled", async () => {
    mockedOpenFileDialog.mockResolvedValue(null);
    const hydrateSpy = vi.spyOn(useAppStore.getState(), "hydrate");

    const result = await importConfig();

    expect(result).toBe("cancelled");
    expect(mockedImportConfigFile).not.toHaveBeenCalled();
    expect(hydrateSpy).not.toHaveBeenCalled();
  });

  it("returns invalid for a file that does not parse as a valid persisted state", async () => {
    mockedOpenFileDialog.mockResolvedValue("/tmp/broken.json");
    mockedImportConfigFile.mockResolvedValue("{not json");

    const result = await importConfig();

    expect(result).toBe("invalid");
  });

  it("hydrates the store and returns done for a valid file", async () => {
    mockedOpenFileDialog.mockResolvedValue("/tmp/flux-lane-config.json");
    const persisted = createDefaultPersistedState();
    mockedImportConfigFile.mockResolvedValue(JSON.stringify(persisted));

    const result = await importConfig();

    expect(result).toBe("done");
    expect(useAppStore.getState().activeWorkspaceId).toBe(
      persisted.activeWorkspaceId,
    );
  });
});
