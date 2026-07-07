import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore, type UiStore } from "../uiStore";

const INITIAL_STATE: UiStore = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(INITIAL_STATE, true);
});

describe("uiStore", () => {
  it("has sane defaults", () => {
    const state = useUiStore.getState();
    expect(state.overlay).toBe("none");
    expect(state.view).toBe("main");
    expect(state.paneRuntime).toEqual({});
    expect(state.focusedPaneId).toBeNull();
  });

  it("setOverlay / setView update the corresponding fields", () => {
    useUiStore.getState().setOverlay("modal");
    useUiStore.getState().setView("settings");

    const state = useUiStore.getState();
    expect(state.overlay).toBe("modal");
    expect(state.view).toBe("settings");
  });

  it("generates a default paneRuntime entry on the first partial update", () => {
    useUiStore.getState().setPaneLoading("pane-1", true);

    expect(useUiStore.getState().paneRuntime["pane-1"]).toEqual({
      lifecycle: "suspended",
      currentUrl: null,
      isLoading: true,
    });
  });

  it("partially updates an existing paneRuntime entry without clobbering other fields", () => {
    useUiStore.getState().setPaneLifecycle("pane-1", "active");
    useUiStore.getState().setPaneCurrentUrl("pane-1", "https://example.com");
    useUiStore.getState().setPaneLoading("pane-1", true);

    expect(useUiStore.getState().paneRuntime["pane-1"]).toEqual({
      lifecycle: "active",
      currentUrl: "https://example.com",
      isLoading: true,
    });
  });

  it("removePaneRuntime deletes the entry", () => {
    useUiStore.getState().setPaneLoading("pane-1", true);
    useUiStore.getState().removePaneRuntime("pane-1");

    expect(useUiStore.getState().paneRuntime["pane-1"]).toBeUndefined();
  });

  it("setFocusedPane transitions between panes and back to null", () => {
    useUiStore.getState().setFocusedPane("pane-1");
    expect(useUiStore.getState().focusedPaneId).toBe("pane-1");

    useUiStore.getState().setFocusedPane("pane-2");
    expect(useUiStore.getState().focusedPaneId).toBe("pane-2");

    useUiStore.getState().setFocusedPane(null);
    expect(useUiStore.getState().focusedPaneId).toBeNull();
  });
});
