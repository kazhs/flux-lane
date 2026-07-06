import { IconButton } from "../ui/IconButton";
import { PlusIcon, SettingsIcon } from "../ui/icons";
import { WorkspaceTab } from "./WorkspaceTab";

export type WorkspaceBarProps = {
  workspaces: { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddWorkspace: () => void;
  onOpenSettings: () => void;
};

export function WorkspaceBar({
  workspaces,
  activeId,
  onSelect,
  onAddWorkspace,
  onOpenSettings,
}: WorkspaceBarProps) {
  return (
    <div className="flex h-9 items-center border-b border-border bg-surface pr-2">
      <div className="flex h-full items-center">
        {workspaces.map((workspace) => (
          <WorkspaceTab
            key={workspace.id}
            name={workspace.name}
            active={workspace.id === activeId}
            onSelect={() => onSelect(workspace.id)}
          />
        ))}
        <IconButton
          aria-label="Add workspace"
          icon={<PlusIcon />}
          onClick={onAddWorkspace}
          className="mx-1"
        />
      </div>
      <IconButton
        aria-label="Settings"
        icon={<SettingsIcon />}
        onClick={onOpenSettings}
        className="ml-auto"
      />
    </div>
  );
}
