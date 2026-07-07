---
globs: ["*.ts", "*.tsx", "*.spec.ts", "*.test.ts"]
---

- `any` 禁止。`unknown` + 型ガードで narrowing する
- `as` キャストは最終手段。先に型ガードか設計見直しを検討
- `!` (non-null assertion) 禁止。`?.` か明示的な null チェックを使う
- Enum より union type を使う（例: `type Status = 'active' | 'inactive'`）
- `interface` は拡張が必要な場合、`type` は union/intersection で組み合わせる場合
- パブリック API の戻り値型は明示する（内部実装は推論に任せてよい）
- `strict: true` 前提で書く
