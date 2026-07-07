import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPersistedState } from "../../../lib/defaults";
import { useAppStore, type AppStore } from "../../../stores/appStore";
import { exportConfigFile } from "../../ipc/commands";
import { saveFileDialog } from "../../ipc/dialog";
import { exportConfig } from "../exportConfig";

vi.mock("../../ipc/commands", () => ({
  exportConfigFile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../ipc/dialog", () => ({
  saveFileDialog: vi.fn(),
}));

const mockedExportConfigFile = vi.mocked(exportConfigFile);
const mockedSaveFileDialog = vi.mocked(saveFileDialog);
const INITIAL_STATE: AppStore = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  mockedExportConfigFile.mockClear();
  mockedSaveFileDialog.mockReset();
});

describe("exportConfig", () => {
  it("returns false and does not write when the save dialog is cancelled", async () => {
    useAppStore.getState().hydrate(createDefaultPersistedState());
    mockedSaveFileDialog.mockResolvedValue(null);

    const result = await exportConfig();

    expect(result).toBe(false);
    expect(mockedExportConfigFile).not.toHaveBeenCalled();
  });

  it("writes the current persisted state as pretty JSON to the chosen path", async () => {
    const persisted = createDefaultPersistedState();
    useAppStore.getState().hydrate(persisted);
    mockedSaveFileDialog.mockResolvedValue("/tmp/flux-lane-config.json");

    const result = await exportConfig();

    expect(result).toBe(true);
    expect(mockedExportConfigFile).toHaveBeenCalledTimes(1);
    const [path, json] = mockedExportConfigFile.mock.calls[0]!;
    expect(path).toBe("/tmp/flux-lane-config.json");
    expect(JSON.parse(json)).toEqual(persisted);
  });
});
