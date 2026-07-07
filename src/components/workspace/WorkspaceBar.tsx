import type { MouseEvent } from "react";
import { IconButton } from "../ui/IconButton";
import { PlusIcon, SettingsIcon } from "../ui/icons";
import { WorkspaceTab } from "./WorkspaceTab";

export type WorkspaceBarProps = {
  workspaces: { id: string; name: string; shortcut: string | null }[];
  activeId: string | null;
  /** インライン編集モード中のワークスペース id（ネイティブメニューの「名前を変更」）。 */
  editingWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onAddWorkspace: () => void;
  onOpenSettings: () => void;
  onContextMenu: (id: string, event: MouseEvent) => void;
  onRenameSubmit: (id: string, name: string) => void;
  onRenameCancel: () => void;
};

export function WorkspaceBar({
  workspaces,
  activeId,
  editingWorkspaceId,
  onSelect,
  onAddWorkspace,
  onOpenSettings,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: WorkspaceBarProps) {
  return (
    <div className="chrome-surface flex h-10 items-center border-b border-border pr-2">
      <div className="flex h-full items-center">
        {workspaces.map((workspace) => (
          <WorkspaceTab
            key={workspace.id}
            name={workspace.name}
            active={workspace.id === activeId}
            shortcut={workspace.shortcut}
            editing={workspace.id === editingWorkspaceId}
            onSelect={() => onSelect(workspace.id)}
            onContextMenu={(event) => onContextMenu(workspace.id, event)}
            onRenameSubmit={(name) => onRenameSubmit(workspace.id, name)}
            onRenameCancel={onRenameCancel}
          />
        ))}
        <IconButton
          aria-label="ワークスペースを追加"
          icon={<PlusIcon />}
          onClick={onAddWorkspace}
          className="mx-1"
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <IconButton
          aria-label="Settings"
          icon={<SettingsIcon />}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}
