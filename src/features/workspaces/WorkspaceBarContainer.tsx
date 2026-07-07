import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { WorkspaceBar } from "../../components/workspace/WorkspaceBar";
import { popupWorkspaceMenu } from "../../core/ipc/commands";
import { onWorkspaceMenuAction } from "../../core/ipc/events";
import { confirmDialog } from "../../core/ipc/dialog";
import { shortcutLabel } from "../../lib/shortcutLabel";
import type { Workspace } from "../../types";

export function WorkspaceBarContainer() {
  const workspaces = useAppStore((s) => s.workspaces);
  const workspaceOrder = useAppStore((s) => s.workspaceOrder);
  const activeId = useAppStore((s) => s.activeWorkspaceId);
  const addWorkspace = useAppStore((s) => s.addWorkspace);
  const renameWorkspace = useAppStore((s) => s.renameWorkspace);
  const removeWorkspace = useAppStore((s) => s.removeWorkspace);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);
  const setView = useUiStore((s) => s.setView);

  // ネイティブメニューの「名前を変更」で入るインライン編集モード。同時に編集できる
  // タブは 1 個まで（container の local state で管理。永続化しない）。
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null,
  );

  // WorkspaceTab のネイティブコンテキストメニュー（Rust 側 `popup_workspace_menu`）からの
  // 削除・リネーム操作を受け取る。`PaneRailContainer` と同じ cancelled ガード付きパターン:
  // listen() は非同期に解決するため、cleanup が unlisten 取得前に走ると listener が永久に残る
  // （StrictMode の二重マウント・ビュー切替の再マウントで 1 個ずつ増え、削除確認モーダルが
  // 多重表示される実バグになった）。cancelled ガードで解決直後に破棄する。
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void onWorkspaceMenuAction(async (payload) => {
      if (payload.action === "rename") {
        setEditingWorkspaceId(payload.workspaceId);
        return;
      }
      if (payload.action !== "delete") return;
      const workspace = useAppStore.getState().workspaces[payload.workspaceId];
      const name = workspace?.name ?? payload.workspaceId;
      const ok = await confirmDialog(
        `ワークスペース「${name}」を削除する？配下のペインとセッションも削除される`,
      );
      if (!ok) return;
      removeWorkspace(payload.workspaceId);
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
      unlisten = undefined;
    };
  }, [removeWorkspace]);

  const workspaceList = workspaceOrder
    .map((id) => workspaces[id])
    .filter((workspace): workspace is Workspace => workspace !== undefined)
    .map((workspace, index) => ({
      id: workspace.id,
      name: workspace.name,
      shortcut: shortcutLabel("⌘⇧", index + 1),
    }));

  const handleContextMenu = (id: string, event: ReactMouseEvent) => {
    event.preventDefault();
    void popupWorkspaceMenu(id, workspaceOrder.length <= 1);
  };

  const handleRenameSubmit = (id: string, name: string) => {
    renameWorkspace(id, name);
    setEditingWorkspaceId(null);
  };

  return (
    <WorkspaceBar
      workspaces={workspaceList}
      activeId={activeId}
      editingWorkspaceId={editingWorkspaceId}
      onSelect={setActiveWorkspace}
      onAddWorkspace={() =>
        addWorkspace(`Workspace ${workspaceOrder.length + 1}`)
      }
      onOpenSettings={() => setView("settings")}
      onContextMenu={handleContextMenu}
      onRenameSubmit={handleRenameSubmit}
      onRenameCancel={() => setEditingWorkspaceId(null)}
    />
  );
}
