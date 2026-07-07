import { useEffect } from "react";
import { useUiStore } from "../stores/uiStore";
import { WorkspaceBarContainer } from "../features/workspaces/WorkspaceBarContainer";
import { PaneStripContainer } from "../features/panes/PaneStripContainer";
import { PaneRailContainer } from "../features/panes/PaneRailContainer";
import { AddPaneModal } from "../features/panes/AddPaneModal";
import { SettingsView } from "../features/settings/SettingsView";
import "./App.css";

function App() {
  const view = useUiStore((s) => s.view);
  const addPaneOpen = useUiStore((s) => s.addPaneOpen);
  const setOverlay = useUiStore((s) => s.setOverlay);
  const setFocusedPane = useUiStore((s) => s.setFocusedPane);

  useEffect(() => {
    // 全画面ビュー切替中・ペイン追加モーダル表示中は WebView を隠す
    // （docs/ARCHITECTURE.md 1.2）。main かつモーダル非表示に戻ったら復帰する。
    setOverlay(view === "main" && !addPaneOpen ? "none" : "modal");
  }, [view, addPaneOpen, setOverlay]);

  if (view === "settings") return <SettingsView />;

  return (
    // ペインヘッダー以外の chrome をクリックしたらペインフォーカスを解除する
    // （ペインヘッダーの pointerdown は stopPropagation してここまで届かない）。
    <div
      className="flex h-screen flex-col"
      onPointerDown={() => setFocusedPane(null)}
    >
      <WorkspaceBarContainer />
      <div className="flex flex-1 overflow-hidden">
        <PaneRailContainer />
        <div className="flex-1 overflow-hidden">
          <PaneStripContainer />
        </div>
      </div>
      {addPaneOpen && <AddPaneModal />}
    </div>
  );
}

export default App;
