# flux-lane

複数 SNS を複数アカウントで常時並列監視する macOS 向けアプリ。1 ウィンドウ内にサービス/アカウントごとの WebView ペインを並べ、Cookie/Storage をペイン単位で分離したまま表示し続ける。

## 動作要件

- macOS 14 (Sonoma) 以降 / Apple Silicon
- ペインごとの Cookie/Storage 分離に `WebviewBuilder::data_store_identifier`（WKWebsiteDataStore の UUID 分離）を使用しており、これは macOS 14 未満では利用できない

## セットアップ

```sh
npm install
```

## 開発

```sh
npm run tauri dev
```

## ビルド

```sh
npm run tauri build
```

`src-tauri/target/release/bundle/` 配下に `.app` / `.dmg` が生成される。

## バックアップ

- **構成**（ワークスペース / ペイン / 設定）は設定画面の「エクスポート / インポート」で JSON として持ち出せる
- **セッション**（各ペインのログイン状態）はエクスポート対象外。実体は `~/Library/WebKit/` 配下に WebKit が保持しており、Time Machine や macOS 移行アシスタントで機械ごと移行すれば構成と合わせて復元される
- ログイン Cookie を単体で持ち出せるセッションエクスポートは、credential 相当のファイルを生成することになるため意図的に非対応

## アーキテクチャ

設計・ディレクトリ構成・データモデルは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照。
