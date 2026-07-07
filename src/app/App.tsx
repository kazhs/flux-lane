import { useEffect } from "react";
import { useUiStore } from "../stores/uiStore";
import { WorkspaceBarContainer } from "../features/workspaces/WorkspaceBarContainer";
import { PaneStripContainer } from "../features/panes/PaneStripContainer";
import { AddPaneView } from "../features/panes/AddPaneView";
import { SettingsView } from "../features/settings/SettingsView";
import "./App.css";

function App() {
  const view = useUiStore((s) => s.view);
  const setOverlay = useUiStore((s) => s.setOverlay);
  const setFocusedPane = useUiStore((s) => s.setFocusedPane);

  useEffect(() => {
    // 全画面ビュー切替中は WebView を隠す（docs/ARCHITECTURE.md 1.2）。main に戻ったら復帰する。
    setOverlay(view === "main" ? "none" : "modal");
  }, [view, setOverlay]);

  if (view === "add-pane") return <AddPaneView />;
  if (view === "settings") return <SettingsView />;

  return (
    // ペインヘッダー以外の chrome をクリックしたらペインフォーカスを解除する
    // （ペインヘッダーの pointerdown は stopPropagation してここまで届かない）。
    <div
      className="flex h-screen flex-col"
      onPointerDown={() => setFocusedPane(null)}
    >
      <WorkspaceBarContainer />
      <div className="flex-1 overflow-hidden">
        <PaneStripContainer />
      </div>
    </div>
  );
}

export default App;
