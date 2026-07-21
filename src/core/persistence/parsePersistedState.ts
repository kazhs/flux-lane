import { CURRENT_SCHEMA_VERSION } from "../../types";
import type {
  AppSettings,
  AutoScrollSpeed,
  Pane,
  PersistedState,
  Workspace,
} from "../../types";

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

function isAutoScrollSpeed(value: unknown): value is AutoScrollSpeed {
  return (
    value === 1 || value === 2 || value === 3 || value === 4 || value === 5
  );
}

/** `autoScroll` / `autoScrollSpeed` は追加時期が異なるため旧永続化データでの欠落を許容し、
 * {@link sanitizeMissingAutoScrollFields} で既定値（false / 1）を補完する。
 * 値がある場合の型不一致は reject する。 */
function isPane(value: unknown): value is Pane {
  return (
    isPlainObject(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.url) &&
    isString(value.sessionId) &&
    isFiniteNumber(value.width) &&
    isBoolean(value.muted) &&
    (value.autoScroll === undefined || isBoolean(value.autoScroll)) &&
    (value.autoScrollSpeed === undefined ||
      isAutoScrollSpeed(value.autoScrollSpeed))
  );
}

function isAppSettings(value: unknown): value is AppSettings {
  return isPlainObject(value) && isFiniteNumber(value.defaultPaneWidthRatio);
}

/**
 * workspace.paneIds に panes へ実在しない参照（dangling）があれば取り除いた複製を返す。
 * 参照不整合だけで設定全体をデフォルトに戻すのは過剰なため、reject でなく修復する。
 */
function sanitizeDanglingPaneIds(state: PersistedState): PersistedState {
  const workspaces: Record<string, Workspace> = {};
  let changed = false;
  for (const [id, workspace] of Object.entries(state.workspaces)) {
    const paneIds = workspace.paneIds.filter((paneId) => paneId in state.panes);
    changed ||= paneIds.length !== workspace.paneIds.length;
    workspaces[id] = { ...workspace, paneIds };
  }
  return changed ? { ...state, workspaces } : state;
}

/**
 * `autoScroll` / `autoScrollSpeed` が欠落した pane（それぞれの機能追加前に保存された旧データ）
 * に既定値を補完した複製を返す。{@link isPane} で型は検証済みなので、ここでは欠落のみを扱う。
 */
function sanitizeMissingAutoScrollFields(
  state: PersistedState,
): PersistedState {
  const panes: Record<string, Pane> = {};
  let changed = false;
  for (const [id, pane] of Object.entries(state.panes)) {
    const missingAutoScroll = typeof pane.autoScroll !== "boolean";
    const missingSpeed = !isAutoScrollSpeed(pane.autoScrollSpeed);
    if (!missingAutoScroll && !missingSpeed) {
      panes[id] = pane;
      continue;
    }
    changed = true;
    panes[id] = {
      ...pane,
      autoScroll: missingAutoScroll ? false : pane.autoScroll,
      autoScrollSpeed: missingSpeed ? 1 : pane.autoScrollSpeed,
    };
  }
  return changed ? { ...state, panes } : state;
}

/** v1 スキーマの構造検証。フィールド存在・型・参照整合性（activeWorkspaceId / workspaceOrder が実在する workspace を指すか）まで確認する。paneIds の dangling 参照は reject せず {@link sanitizeDanglingPaneIds} で修復する。 */
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
      return isPersistedStateV1(raw)
        ? sanitizeMissingAutoScrollFields(sanitizeDanglingPaneIds(raw))
        : null;
    default:
      return null;
  }
}
