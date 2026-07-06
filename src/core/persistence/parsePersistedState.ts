import { CURRENT_SCHEMA_VERSION } from "../../types";
import type { AppSettings, Pane, PersistedState, Workspace } from "../../types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isRecordOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is Record<string, T> {
  return isPlainObject(value) && Object.values(value).every(isItem);
}

function isWorkspace(value: unknown): value is Workspace {
  return (
    isPlainObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isStringArray(value.paneIds)
  );
}

function isPane(value: unknown): value is Pane {
  return (
    isPlainObject(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.url) &&
    isString(value.sessionId) &&
    isFiniteNumber(value.width) &&
    isBoolean(value.muted)
  );
}

function isAppSettings(value: unknown): value is AppSettings {
  return isPlainObject(value) && isFiniteNumber(value.defaultPaneWidthRatio);
}

/** v1 スキーマの構造検証。フィールド存在・型・参照整合性（activeWorkspaceId / workspaceOrder が実在する workspace を指すか）まで確認する。 */
function isPersistedStateV1(
  value: Record<string, unknown>,
): value is Record<string, unknown> & PersistedState {
  if (!isRecordOf(value.workspaces, isWorkspace)) return false;
  if (!isRecordOf(value.panes, isPane)) return false;
  if (!isStringArray(value.workspaceOrder)) return false;
  if (!isString(value.activeWorkspaceId)) return false;
  if (!isAppSettings(value.settings)) return false;

  const workspaces = value.workspaces;
  if (!(value.activeWorkspaceId in workspaces)) return false;
  if (!value.workspaceOrder.every((id) => id in workspaces)) return false;

  return true;
}

/**
 * JSON 文字列を `PersistedState` として検証・復元する。壊れた JSON・未知の `schemaVersion`・
 * 型不一致・参照不整合（存在しない workspace を指す等）はすべて `null` を返す（呼び出し側は
 * `createDefaultPersistedState()` にフォールバックする）。
 *
 * `schemaVersion` ごとの分岐は将来の migration チェーンの差し込み点。現行は v1 のみ対応。
 */
export function parsePersistedState(json: string): PersistedState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isPlainObject(raw)) return null;

  switch (raw.schemaVersion) {
    case CURRENT_SCHEMA_VERSION:
      return isPersistedStateV1(raw) ? raw : null;
    default:
      return null;
  }
}
