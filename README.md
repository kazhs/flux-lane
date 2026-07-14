# FluxLane

複数 SNS を複数アカウントで常時並列監視する macOS 向けアプリ。1 ウィンドウ内にサービス/アカウントごとの WebView ペインを並べ、Cookie/Storage をペイン単位で分離したまま表示し続ける。

## 動作要件

- macOS 14 (Sonoma) 以降 / Apple Silicon
- ペインごとの Cookie/Storage 分離に `WebviewBuilder::data_store_identifier`（WKWebsiteDataStore の UUID 分離）を使用しており、これは macOS 14 未満では利用できない

## インストール

[Releases](https://github.com/kazhs/flux-lane/releases) から dmg をダウンロードして `FluxLane.app` を Applications にコピーする。

配布バイナリは**未署名**（Apple Developer Program 非加入のため）。初回起動時に「壊れているため開けません」等の警告でブロックされた場合は、次のどちらかで回避する:

- システム設定 → プライバシーとセキュリティ → 下部の「このまま開く」をクリック
- またはターミナルで quarantine 属性を外す:

  ```sh
  xattr -d com.apple.quarantine /Applications/FluxLane.app
  ```

未署名バイナリの実行が気になる場合は、下記「ソースからビルド」で自分でビルドしたものを使う（ローカルビルドには quarantine が付かないため警告なしで起動する）。

## ソースからビルド

```sh
npm install
npm run tauri build
```

`src-tauri/target/release/bundle/` 配下に `.app` / `.dmg` が生成される。Rust toolchain と Node.js が必要。

## 開発

```sh
npm install
npm run tauri dev
```

## バックアップ

- **構成**（ワークスペース / ペイン / 設定）は設定画面の「エクスポート / インポート」で JSON として持ち出せる
- **セッション**（各ペインのログイン状態）はエクスポート対象外。実体は `~/Library/WebKit/` 配下に WebKit が保持しており、Time Machine や macOS 移行アシスタントで機械ごと移行すれば構成と合わせて復元される
- ログイン Cookie を単体で持ち出せるセッションエクスポートは、credential 相当のファイルを生成することになるため意図的に非対応

## アーキテクチャ

設計・ディレクトリ構成・データモデルは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照。
