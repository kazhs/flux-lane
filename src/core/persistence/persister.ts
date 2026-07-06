import type { StoreApi } from "zustand";
import { PERSIST_DEBOUNCE_MS } from "../../lib/constants";
import { selectPersistedState } from "../../stores/selectors";
import type { AppStore } from "../../stores/appStore";
import { savePersistedState } from "../ipc/commands";

export interface Persister {
  /** 保留中の debounce をキャンセルし、即座に保存する。 */
  flush: () => void;
  /** subscribe を解除し、保留中の debounce もキャンセルする。以後は何もしない。 */
  stop: () => void;
}

type SubscribableStore = Pick<StoreApi<AppStore>, "getState" | "subscribe">;

/**
 * `store` の変更を購読し、hydrate 済み（`activeWorkspaceId` が確定している）ときだけ
 * `selectPersistedState` → JSON.stringify → `savePersistedState`（ipc）を
 * {@link PERSIST_DEBOUNCE_MS} debounce で呼ぶ（docs/ARCHITECTURE.md 1.8）。
 */
export function createPersister(store: SubscribableStore): Persister {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancelTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const persistNow = (): void => {
    const state = store.getState();
    // hydrate 前は activeWorkspaceId が null。保存対象がまだ確定していない。
    if (state.activeWorkspaceId === null) return;
    void savePersistedState(JSON.stringify(selectPersistedState(state)));
  };

  const unsubscribe = store.subscribe(() => {
    cancelTimer();
    timer = setTimeout(() => {
      timer = null;
      persistNow();
    }, PERSIST_DEBOUNCE_MS);
  });

  return {
    flush: () => {
      cancelTimer();
      persistNow();
    },
    stop: () => {
      cancelTimer();
      unsubscribe();
    },
  };
}
