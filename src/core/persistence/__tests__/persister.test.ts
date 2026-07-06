import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSIST_DEBOUNCE_MS } from "../../../lib/constants";
import { createDefaultPersistedState } from "../../../lib/defaults";
import { useAppStore, type AppStore } from "../../../stores/appStore";
import { savePersistedState } from "../../ipc/commands";
import { createPersister } from "../persister";

vi.mock("../../ipc/commands", () => ({
  savePersistedState: vi.fn().mockResolvedValue(undefined),
}));

const mockedSave = vi.mocked(savePersistedState);
const INITIAL_STATE: AppStore = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  mockedSave.mockClear();
});

describe("createPersister", () => {
  it("does not save while the store is not hydrated", () => {
    vi.useFakeTimers();
    try {
      const persister = createPersister(useAppStore);
      persister.flush();
      expect(mockedSave).not.toHaveBeenCalled();
      persister.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("debounces rapid changes into a single save after PERSIST_DEBOUNCE_MS", () => {
    vi.useFakeTimers();
    try {
      useAppStore.getState().hydrate(createDefaultPersistedState());
      const persister = createPersister(useAppStore);

      useAppStore.getState().addWorkspace("A");
      useAppStore.getState().addWorkspace("B");

      expect(mockedSave).not.toHaveBeenCalled();
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 1);
      expect(mockedSave).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(mockedSave).toHaveBeenCalledTimes(1);

      persister.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("flush saves immediately and cancels the pending debounce", () => {
    vi.useFakeTimers();
    try {
      useAppStore.getState().hydrate(createDefaultPersistedState());
      const persister = createPersister(useAppStore);

      useAppStore.getState().addWorkspace("A");
      persister.flush();
      expect(mockedSave).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS);
      expect(mockedSave).toHaveBeenCalledTimes(1);

      persister.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stop unsubscribes so later changes never trigger a save", () => {
    vi.useFakeTimers();
    try {
      useAppStore.getState().hydrate(createDefaultPersistedState());
      const persister = createPersister(useAppStore);
      persister.stop();

      useAppStore.getState().addWorkspace("A");
      vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS);
      expect(mockedSave).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
