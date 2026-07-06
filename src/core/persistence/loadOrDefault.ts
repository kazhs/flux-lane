import type { PersistedState } from "../../types";
import { createDefaultPersistedState } from "../../lib/defaults";
import { loadPersistedState } from "../ipc/commands";
import { parsePersistedState } from "./parsePersistedState";

/** 起動時の復元。未保存・壊れた保存内容・未知スキーマはすべてデフォルト状態にフォールバックする。 */
export async function loadOrDefault(): Promise<PersistedState> {
  const json = await loadPersistedState();
  if (json === null) return createDefaultPersistedState();
  return parsePersistedState(json) ?? createDefaultPersistedState();
}
