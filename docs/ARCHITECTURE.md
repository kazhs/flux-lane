# flux-lane アーキテクチャ設計

複数 SNS を複数アカウントで常時並列監視する Mac 向け WebView 管理アプリ。

## 0. 成立条件（検証済みの技術前提）

| 前提                                                 | 根拠                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 ウィンドウに複数のネイティブ WebView を配置できる  | Tauri v2 `unstable` feature の `Window::add_child` + `WebviewBuilder`（[PR #8280](https://github.com/tauri-apps/tauri/pull/8280)）                                                                                                                                             |
| WebView ごとに独立した Cookie/Storage を永続化できる | `WebviewBuilder::data_store_identifier`（macOS 14+ / iOS 17+）。WKWebsiteDataStore を UUID 単位で分離し、`~/Library/WebKit/<bundle-id>/WebsiteDataStore/<UUID>` に WebKit 自身が永続化する（[docs.rs](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewBuilder.html)） |

**制約: macOS 14 (Sonoma) 以降が必須。** 14 未満では per-webview のデータ分離手段が WKWebView に存在しない。

iframe 方式は X/Discord が `X-Frame-Options` / CSP で拒否するため不可。`WebviewWindow` を複数並べる方式は 1 画面統合 UX にならないため不可。マルチ WebView 一択。

## 1. 全体アーキテクチャ

### 1.1 二層構造: Chrome Layer + Pane Layer

```
┌─ Tauri Window ──────────────────────────────────────────────┐
│ ┌─ Chrome Layer（メイン webview / React UI）───────────────┐ │
│ │  Workspace バー / ペインヘッダー / + ボタン / 設定       │ │
│ │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │ │
│ │ │ header │ │ header │ │ header │ │ header │  ← DOM      │ │
│ │ ├────────┤ ├────────┤ ├────────┤ ├────────┤             │ │
│ │ │placeho-│ │placeho-│ │placeho-│ │placeho-│  ← DOM 上の │ │
│ │ │ lder   │ │ lder   │ │ lder   │ │ lder   │    空き枠   │ │
│ │ └────────┘ └────────┘ └────────┘ └────────┘             │ │
│ └──────────────────────────────────────────────────────────┘ │
│   ▲ placeholder の rect に合わせてネイティブ webview を      │
│     ぴったり重ねる（Rust 側で bounds 指定）                  │
│  [WebView A]  [WebView B]  [WebView C]  [WebView D]          │
└──────────────────────────────────────────────────────────────┘
```

- **Chrome Layer**: Tauri のメイン webview。React + Tailwind。ヘッダー・レイアウト・設定・DnD などアプリ UI 全部。
- **Pane Layer**: ペイン 1 つ = ネイティブ WebView 1 つ。React は各ペインの「placeholder（空き枠）」だけを描画し、その画面座標を測ってネイティブ WebView を上に重ねる。

### 1.2 最重要制約: ネイティブ WebView は常に DOM より手前

モーダル・ドロップダウン・DnD ゴーストは WebView に隠される。よって **Overlay Mode** を一級概念として設計に組み込む:

- `uiStore.overlay`（`none | modal | dragging | resizing | ...`）が `none` 以外になったら、WebviewManager が該当領域の WebView を `hide()`（または全 WebView hide）。
- 設定画面・ペイン追加はモーダルではなく **全画面ビュー切替**（TradingView/Linear 的）にして、その間は全 WebView を hide。中途半端なポップオーバーを作らないことが UI ミニマル方針とも一致する。
- DnD 中はドラッグ対象（または全ペイン）の WebView を hide し、プレースホルダーカード（タイトル+アイコン）を表示。
- **幅リサイズドラッグ中も同様**。ハンドルは DOM 側にあるため、ドラッグ中にポインタがネイティブ WebView 上へ入るとマウスイベントを奪われる。リサイズ開始 = `resizing` overlay で WebView を hide し、プレースホルダー上で幅をライブプレビュー、確定時に bounds 反映 + show。

### 1.3 レイアウトと同期

- ペイン列は CSS（`flex` + `overflow-x: auto` + `flex-shrink: 0`）で placeholder を並べる。高さは全ペイン 100% 固定。
- **幅はペインごとに可変**。ペイン右端のリサイズハンドル（DOM 上の細いストリップ）をドラッグして個別調整する。設定画面の固定幅指定は持たない。
  - 新規ペインのデフォルト幅 = **作成時点の window 幅の 50%**（作成時に px へ確定して保存）。
  - 保存単位は px。window リサイズで既存ペインは再スケールしない（横スクロールで吸収する方が監視用途では予測可能）。最小幅 300px、最大は window 幅にクランプ。
- `LayoutController` が scroll / resize / 幅変更 / 並び替えを監視し、各 placeholder の rect を計測 → 差分のある WebView にだけ `set_bounds` IPC を送る（`requestAnimationFrame` で throttle）。
- ビューポート外に出た WebView は `hide()`、戻ったら `show()`。スクロール中も WebKit のレンダリングは bounds 移動だけなので軽い。

### 1.4 データフロー（単方向）

```
UI 操作 ─→ Zustand store 更新 ─→ ① React 再描画（placeholder）
                              └→ ② WebviewManager が native へ同期（create/destroy/bounds/reload）
                              └→ ③ Persistence が debounce 保存

native イベント（title 変更・navigation 等）
        ─→ Tauri event ─→ store 反映 ─→ React 再描画
```

store が唯一の真実。WebviewManager は store の subscriber であり、React コンポーネントは native WebView を直接触らない。

### 1.5 責務分割（TS 主導・Rust 最小）

**Rust 側は「ネイティブ WebView のリモコン」に徹する。** ロジックは持たない。

| Rust command                                          | 内容                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `create_pane_webview(label, url, session_id, bounds)` | `data_store_identifier` 付きで `add_child`（http/https 以外のスキームは拒否）         |
| `destroy_pane_webview(label, purge_data)`             | close。`purge_data` が true のときのみ `clear_all_browsing_data` でデータストアも削除 |
| `set_pane_bounds(label, bounds)`                      | 位置・サイズ                                                                          |
| `set_pane_visible(label, visible)`                    | show/hide                                                                             |
| `reload_pane(label)` / `eval_in_pane(label, js)`      | リロード / JS 注入                                                                    |

Rust → TS イベント: `pane://page-load`（payload: `{ label, url, event: "started" | "finished" }`）。ページ読込の開始/終了を `on_page_load` で emit し、TS 側は `finished` でミュート再注入・現在 URL 反映を行う。

### 1.6 セッション管理

- `sessionId`（UUID v4）を **ペイン ID とは別に** 持つ。`data_store_identifier` に渡す 16 bytes はこの UUID。
- 分離する理由: 将来「同一アカウントの X をタイムライン別に 2 ペイン」のようなセッション共有、ワークスペース複製時のセッション引き継ぎ/新規発行の選択ができる。
- Cookie/Storage の永続化は WebKit 任せ（アプリは何も保存しない）。アプリが保存するのは `sessionId` の対応表のみ。
- ペイン削除時は WebView destroy + データストア削除（`WKWebsiteDataStore.remove` 相当）を Rust 側 command で行う（ゴミが `~/Library/WebKit` に残らないように）。
- Windows 将来対応: WebView2 はユーザーデータフォルダ分離で同等機能を実現できるため、Rust 側を `SessionBackend` として trait 化しておく（TS 層は `sessionId` しか知らないので無変更で移植可能）。

### 1.7 パフォーマンス設計（10〜20 ペイン）

ペインのライフサイクルを 3 状態で管理:

| 状態        | WebView                            | 適用                                      |
| ----------- | ---------------------------------- | ----------------------------------------- |
| `active`    | 実体あり・表示                     | ビューポート内                            |
| `hidden`    | 実体あり・非表示                   | ビューポート外（スクロールで即復帰）      |
| `suspended` | 実体なし（セッションは永続化済み） | 非アクティブ workspace / 明示的サスペンド |

- Workspace 切替 = 旧 workspace の全ペインを `suspended`、新 workspace を実体化。WebView 数は常に「アクティブ workspace のペイン数」に抑えられる（`WebviewManager.reconcile`）。
- **実装状況（既知の制限）**: `active`/`suspended` は上記の通り実装済み。`hidden`（ビューポート外での非表示）と `SuspendPolicy` の Strategy 化は `PaneLifecycle` 型に列としては残しているが、駆動するロジックは未実装（`setPaneLifecycle` の呼び出し元が無い）。現状は全ペイン常に `active` 表示で、スクロールアウトしても hide しない。将来必要になったら `LayoutController` の rect 計測結果（画面外判定）から駆動する想定。

### 1.8 状態管理・永続化

- **Zustand**（slice パターン）。Redux はこの規模に過剰、Context は subscriber 型同期（WebviewManager）と相性が悪い。
- 永続化は Rust command 経由で `$APPDATA/config.json` に debounce（500ms）書き込み。`schemaVersion` を持たせ、migration 関数チェーンで前方互換。
- 保存対象: workspaces / ペイン定義（URL・タイトル・幅・順序・sessionId）/ 最後に開いていた workspaceId / グローバル設定。Cookie/Storage は保存しない（WebKit 管轄）。

### 1.9 将来拡張の受け口

- **ペイン = `ServiceDefinition` 抽象**: 現状は `{ name, url }` の generic サービスのみだが、`ServiceDefinition`（favicon 取得・通知バッジ抽出・init script を宣言的に持つ）を将来サービス固有実装のプラグイン点にする。
- **init script チャネル**: title 監視スクリプトと同じ経路で通知バッジ・AI 要約用 DOM 抽出を注入できる。
- **ミュート**: JS 注入方式（`video/audio` 要素を MutationObserver で `muted` 強制、`eval_in_pane` 経由）で確定。ネイティブのページミュートは Tauri 公開 API に無いため採用せず。ナビゲーションで注入済み script が消えるため `pane://page-load` の `finished` イベントで再注入する（`WebviewManager`）。

## 2. ディレクトリ構成

```
flux-lane/
├── src/                          # React (Chrome Layer)
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx               # ルート。ビュー切替（main / settings / add-pane）
│   │   └── bootstrap.ts          # 起動シーケンス: 永続化 load → store 復元 → WebviewManager 起動
│   ├── components/               # presentational（store 非依存・props のみ）
│   │   ├── ui/                   # Button, IconButton, TextField, ...
│   │   ├── pane/                 # PaneHeader, PanePlaceholder, PaneStrip
│   │   └── workspace/            # WorkspaceBar, WorkspaceTab
│   ├── features/                 # ユースケース単位の hooks + container
│   │   ├── panes/                # ペイン CRUD・並び替え（DnD）・ヘッダー操作
│   │   ├── workspaces/           # workspace CRUD・切替
│   │   └── settings/             # 設定画面
│   ├── stores/                   # Zustand slices
│   │   ├── appStore.ts           # workspaces + panes + activeWorkspaceId
│   │   ├── uiStore.ts            # overlay mode / drag 状態 / 現在ビュー
│   │   └── selectors.ts
│   ├── core/                     # UI 非依存のドメイン層（React import 禁止）
│   │   ├── webview/
│   │   │   ├── WebviewManager.ts # store 購読 → native 同期の facade
│   │   │   ├── LayoutController.ts # rect 計測・差分 bounds 配信
│   │   │   └── reconcile.ts      # create/destroy 差分計算（純関数）
│   │   ├── persistence/          # load/save・schema（sessionId は appStore.addPane 内で crypto.randomUUID 発行）
│   │   └── ipc/                  # Tauri invoke/event の型付き wrapper（唯一の Tauri 依存点）
│   ├── types/                    # ドメインモデル（Pane, Workspace, Settings, ...）
│   └── lib/                      # 汎用 util
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs                # plugin 登録・setup
│   │   ├── commands/
│   │   │   ├── webview.rs        # create/destroy/bounds/visible/reload/eval
│   │   │   └── storage.rs        # config.json load/save
│   │   └── session/
│   │       └── mod.rs            # sessionId(UUID) <-> data_store_identifier([u8; 16]) 変換のみ。
│   │                             # SessionBackend trait 化・macos.rs/windows.rs 分割は未着手
│   ├── capabilities/
│   ├── tauri.conf.json
│   └── Cargo.toml                # tauri { features = ["unstable"] }
├── docs/
│   └── ARCHITECTURE.md
└── package.json / vite.config.ts / tsconfig.json / eslint / prettier
```

依存方向: `features → stores → core → (ipc) → Rust`。`core/` は React を import しない（単体テスト可能）。`components/` は store を import しない。Tauri API を直接触るのは `core/ipc/` のみ（モック差し替えでフロントを単体テストできる）。

## 3. データモデル（概略・次ステップで詳細化）

```ts
type PaneId = string; // uuid
type WorkspaceId = string; // uuid
type SessionId = string; // uuid → data_store_identifier (16 bytes)

interface Pane {
  id: PaneId;
  title: string;
  url: string; // 初期 URL（現在 URL はランタイム状態で別管理）
  sessionId: SessionId;
  width: number; // px。min 300。新規作成時 = window 幅の 50% を確定値として保存
  muted: boolean;
}

interface Workspace {
  id: WorkspaceId;
  name: string;
  paneIds: PaneId[]; // 並び順
}

interface PersistedState {
  schemaVersion: 1;
  workspaces: Record<WorkspaceId, Workspace>;
  panes: Record<PaneId, Pane>;
  workspaceOrder: WorkspaceId[];
  activeWorkspaceId: WorkspaceId;
  settings: { defaultPaneWidthRatio: number }; // 新規ペイン幅 = window 幅 × ratio（デフォルト 0.5）
}
```

ランタイム専用状態（webview 実体の有無・現在 URL・ロード中フラグ・overlay mode）は永続化対象と分離して `uiStore` / WebviewManager 内部に持つ。

## 4. 主要ライブラリ選定

| 用途     | 選定                       | 理由                                    |
| -------- | -------------------------- | --------------------------------------- |
| 状態管理 | Zustand                    | subscriber 同期と相性が良い・軽量       |
| DnD      | dnd-kit                    | 保守されている・sortable が要件そのもの |
| スタイル | Tailwind CSS               | 指定推奨・ミニマル UI に十分            |
| ID       | crypto.randomUUID          | 依存追加不要                            |
| Rust 側  | tauri v2 (`unstable`) のみ | プラグイン追加は最小限                  |

## 5. 実装ステップ（レビュー単位）

1. ~~アーキテクチャ設計~~（本ドキュメント）
2. ~~ディレクトリ構成~~（本ドキュメント）
3. ~~データモデル + 型定義の確定~~（`src/types/`）
4. ~~状態管理（Zustand slices + selectors）~~（`src/stores/`）
5. ~~WebView 管理（Rust commands + WebviewManager + LayoutController）~~（`src-tauri/src/commands/webview.rs`, `src/core/webview/`）
6. ~~Workspace 管理~~（`src/features/workspaces/`）
7. ~~UI 実装（PaneStrip / PaneHeader / WorkspaceBar / 追加フロー）~~（`src/components/`, `src/features/panes/`）
8. ~~永続化（load/save + 起動復元）~~（`src/core/persistence/`）
9. ~~DnD 並び替え + 幅リサイズハンドル~~（`src/features/panes/dragOrder.ts`, `useResizePane.ts`）
10. ~~設定画面~~（`src/features/settings/SettingsView.tsx`: 新規ペインのデフォルト幅比率スライダー、ワークスペースの名称変更・削除）
11. ~~品質改善（エラーハンドリング・ESLint/Prettier 整備）~~。suspend ポリシーの Strategy 化は未着手（1.7 参照）
