import { useAppStore } from "../stores/appStore";
import { webviewManager } from "../core/webview/WebviewManager";
import { layoutController } from "../core/webview/LayoutController";
import { createPersister, type Persister } from "../core/persistence/persister";
import { loadOrDefault } from "../core/persistence/loadOrDefault";
import { completeShutdown } from "../core/ipc/commands";
import { onAppCloseRequested } from "../core/ipc/events";

let persister: Persister | null = null;

/** flush が異常に長引いても終了はさせる（ハング回避を優先する上限）。 */
const SHUTDOWN_FLUSH_TIMEOUT_MS = 2000;

/**
 * 二段階シャットダウンのフロント側。Rust が CloseRequested を止めてこのイベントを
 * 投げてくるので、永続化 flush の完了（またはタイムアウト）を待ってから終了を依頼する。
 * beforeunload の fire-and-forget flush では IPC 完了前にプロセスが落ち得るため。
 */
async function shutdownGracefully(): Promise<void> {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, SHUTDOWN_FLUSH_TIMEOUT_MS);
  });
  try {
    await Promise.race([persister?.flush() ?? Promise.resolve(), timeout]);
  } finally {
    void completeShutdown();
  }
}

/**
 * 起動シーケンス（docs/ARCHITECTURE.md ディレクトリ構成コメント）:
 * 永続化 load → store 復元 → WebviewManager 起動 → LayoutController 起動 → persister 起動。
 * main.tsx から一度だけ呼ぶ。
 */
export async function bootstrap(): Promise<void> {
  const persisted = await loadOrDefault();
  useAppStore.getState().hydrate(persisted);

  await webviewManager.init();

  layoutController.start((rects, hiddenChanges) => {
    void webviewManager.setBounds(rects);
    webviewManager.setLayoutHidden(hiddenChanges);
  });

  persister = createPersister(useAppStore);

  void onAppCloseRequested(() => {
    void shutdownGracefully();
  });

  // 二段階シャットダウンが主経路。beforeunload は reload 等の取りこぼし向け best-effort。
  window.addEventListener("beforeunload", () => {
    void persister?.flush();
  });
}
