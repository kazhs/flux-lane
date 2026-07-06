import { useAppStore } from "../stores/appStore";
import { webviewManager } from "../core/webview/WebviewManager";
import { layoutController } from "../core/webview/LayoutController";
import { createPersister, type Persister } from "../core/persistence/persister";
import { loadOrDefault } from "../core/persistence/loadOrDefault";

let persister: Persister | null = null;

/**
 * 起動シーケンス（docs/ARCHITECTURE.md ディレクトリ構成コメント）:
 * 永続化 load → store 復元 → WebviewManager 起動 → LayoutController 起動 → persister 起動。
 * main.tsx から一度だけ呼ぶ。
 */
export async function bootstrap(): Promise<void> {
  const persisted = await loadOrDefault();
  useAppStore.getState().hydrate(persisted);

  await webviewManager.init();

  layoutController.start((rects) => {
    void webviewManager.setBounds(rects);
  });

  persister = createPersister(useAppStore);

  window.addEventListener("beforeunload", () => {
    persister?.flush();
  });
}
