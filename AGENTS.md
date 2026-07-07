# AGENTS.md

PJ 固有の AI 向け指示。各種 AI ツール (Claude Code / Codex / Copilot / Cursor / Aider / Jules 等) はこのファイルを参照する。Claude Code は `CLAUDE.md` 経由でインポート。

## プロジェクト概要

FluxLane — 複数 SNS を複数アカウントで常時並列監視する macOS 向けマルチ WebView 管理アプリ。設計の SoT は docs/ARCHITECTURE.md（設計に触れる変更は同期する）。

## 技術スタック

- Tauri v2（`unstable` feature: マルチ WebView）+ Rust（src-tauri/）
- React 19 + TypeScript strict + Vite + Tailwind CSS 4 + Zustand
- テスト: Vitest（node 環境、store・純関数のみ）
- 動作要件: macOS 14+ / Apple Silicon（WKWebsiteDataStore の data_store_identifier 依存）

## アーキテクチャ上の絶対制約

- **ネイティブ WebView は常に DOM より手前**に描画され、マウスイベントも奪う。DOM のオーバーレイ UI（モーダル・ポップオーバー）は WebView 上に置けない。docs/ARCHITECTURE.md §1.2 の Overlay Mode を必ず経由する
- **Tauri API の import は `src/core/ipc/` のみ**。他層は ipc ラッパー経由で呼ぶ
- **store（Zustand）が唯一の真実**。React から native WebView を直接触らない。native 同期は WebviewManager の store 購読経由
- wry (WKWebView) は `window.confirm/prompt/alert` 未実装。確認 UI は `core/ipc/dialog.ts` を使う

## 実装規約

- zustand セレクタ: React の `useStore(selector)` に渡すのは「store 内の既存参照 or プリミティブ」のみ。派生配列/オブジェクトを返すと無限再レンダーになる（過去に実バグ化）
- Tauri の `listen()` を React effect で購読する時は cancelled ガード必須（非同期解決前の cleanup で listener がリークする。PaneRailContainer 参照）
- 外部オリジン（pane-remote capability）に開放する command は最小限 + per-label レートリミット + 入力検証を必ず付ける
- Rust は「WebView のリモコン」に徹し、ロジックは TS 側に置く

## 検証コマンド

- `npm run typecheck` / `npm run lint` / `npm run test` / `npx prettier --check .`
- `cd src-tauri && cargo check`（Rust 変更時）
- 起動確認: `npm run tauri dev`（port 1420 使用中のプロセスを勝手に kill しない）
- リリースビルド: `npm run tauri build`

## コミット規約

Conventional Commits・日本語。
