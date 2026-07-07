import { useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { IconButton } from "../../components/ui/IconButton";
import { CloseIcon } from "../../components/ui/icons";
import { confirmDialog } from "../../core/ipc/dialog";
import { exportConfig } from "../../core/persistence/exportConfig";
import { importConfig } from "../../core/persistence/importConfig";

const MIN_RATIO_PERCENT = 20;
const MAX_RATIO_PERCENT = 90;

export function SettingsView() {
  const setView = useUiStore((s) => s.setView);
  const defaultPaneWidthRatio = useAppStore(
    (s) => s.settings.defaultPaneWidthRatio,
  );
  const updateSettings = useAppStore((s) => s.updateSettings);
  const workspaceOrder = useAppStore((s) => s.workspaceOrder);
  const workspaces = useAppStore((s) => s.workspaces);
  const renameWorkspace = useAppStore((s) => s.renameWorkspace);
  const removeWorkspace = useAppStore((s) => s.removeWorkspace);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const ratioPercent = Math.round(defaultPaneWidthRatio * 100);

  const handleRatioChange = (value: number) => {
    const clamped = Math.min(
      Math.max(value, MIN_RATIO_PERCENT),
      MAX_RATIO_PERCENT,
    );
    updateSettings({ defaultPaneWidthRatio: clamped / 100 });
  };

  const handleRemoveWorkspace = async (id: string, name: string) => {
    const ok = await confirmDialog(`ワークスペース「${name}」を削除しますか？`);
    if (!ok) return;
    removeWorkspace(id);
  };

  const handleExport = async () => {
    try {
      const done = await exportConfig();
      setBackupMessage(done ? "エクスポートしました" : null);
    } catch {
      setBackupMessage("エクスポートに失敗しました");
    }
  };

  const handleImport = async () => {
    const ok = await confirmDialog(
      "現在の構成を置き換えます。ペインのセッション（ログイン状態）は含まれない/変わりません。よろしいですか？",
    );
    if (!ok) return;

    try {
      const result = await importConfig();
      if (result === "done") setBackupMessage("インポートしました");
      else if (result === "invalid") setBackupMessage("無効なファイルです");
    } catch {
      setBackupMessage("インポートに失敗しました");
    }
  };

  return (
    <div className="flex h-screen flex-col gap-8 overflow-y-auto bg-bg p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => setView("main")}>
          戻る
        </Button>
        <h1 className="text-lg font-semibold text-text">設定</h1>
      </div>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">
          新規ペインのデフォルト幅
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={MIN_RATIO_PERCENT}
            max={MAX_RATIO_PERCENT}
            value={ratioPercent}
            onChange={(e) => handleRatioChange(Number(e.target.value))}
            style={{ accentColor: "var(--color-accent)" }}
            className="flex-1"
            aria-label="新規ペインのデフォルト幅（%）"
          />
          <span className="w-12 shrink-0 text-right text-sm text-text-dim">
            {ratioPercent}%
          </span>
        </div>
      </section>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">ワークスペース</h2>
        <ul className="flex flex-col gap-2">
          {workspaceOrder.map((id) => {
            const workspace = workspaces[id];
            if (!workspace) return null;
            return (
              <li key={id} className="flex items-end gap-2">
                <TextField
                  label="名前"
                  value={workspace.name}
                  onChange={(e) => renameWorkspace(id, e.target.value)}
                  className="flex-1"
                />
                <IconButton
                  aria-label={`「${workspace.name}」を削除`}
                  icon={<CloseIcon />}
                  disabled={workspaceOrder.length <= 1}
                  onClick={() => handleRemoveWorkspace(id, workspace.name)}
                  className="mb-1"
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">バックアップ</h2>
        <div className="flex items-center gap-2">
          <Button onClick={() => void handleExport()}>エクスポート…</Button>
          <Button onClick={() => void handleImport()}>インポート…</Button>
        </div>
        {backupMessage && (
          <p className="text-sm text-text-dim">{backupMessage}</p>
        )}
      </section>
    </div>
  );
}
