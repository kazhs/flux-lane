import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { WorkspaceBar } from "../../components/workspace/WorkspaceBar";
import type { Workspace } from "../../types";

export function WorkspaceBarContainer() {
  const workspaces = useAppStore((s) => s.workspaces);
  const workspaceOrder = useAppStore((s) => s.workspaceOrder);
  const activeId = useAppStore((s) => s.activeWorkspaceId);
  const addWorkspace = useAppStore((s) => s.addWorkspace);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);
  const setView = useUiStore((s) => s.setView);

  const workspaceList = workspaceOrder
    .map((id) => workspaces[id])
    .filter((workspace): workspace is Workspace => workspace !== undefined)
    .map((workspace) => ({ id: workspace.id, name: workspace.name }));

  return (
    <WorkspaceBar
      workspaces={workspaceList}
      activeId={activeId}
      onSelect={setActiveWorkspace}
      onAddWorkspace={() =>
        addWorkspace(`Workspace ${workspaceOrder.length + 1}`)
      }
      onAddPane={() => setView("add-pane")}
      onOpenSettings={() => setView("settings")}
    />
  );
}
