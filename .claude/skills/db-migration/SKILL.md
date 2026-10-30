---

name: db-migration
description: D1 のテーブルを足したり列を足したりする手順。テーブル定義（src/worker/db/schema.ts）を変えるとき、マイグレーションを作るときに使う。
---

# テーブルを変える

本番は「列や表の追加だけ」で変える。古いコードが新しいテーブルでも動き続けるようにするため。

## してよいこと

- 表を足す
- 列を足す（NOT NULL にするなら既定値を付ける）
- 索引を足す

## しないこと

- 列や表の削除、名前の変更
- 既にある列の型、NOT NULL、既定値、外部キーの変更（Drizzle が表を作り直す SQL を出すため）
- 記録済みのマイグレーションの書き換え（フックが止める）

どうしても要るときは、理由を河津さんに伝えて了承を取り、SQL に `-- allow-destructive: <理由>` と書く。

## 手順

1. `src/worker/db/schema.ts` を直す
2. `pnpm db:generate` で `migrations/` に SQL を作る
3. 出た SQL を読み、上の「しないこと」が入っていないか確かめる（`pnpm check:migrations` でも検査される）
4. `pnpm db:migrate:local` で手元に当てる
5. `pnpm verify` を通す

本番への適用は、main に入ったあと GitHub Actions が反映の前に行う。手元から `--remote` は使わない。

## 戻したいとき

本番のデータを戻すのは河津さんが D1 の Time Travel で行う。こちらでは打ち消すマイグレーション（列を使わなくするコード変更）を出す。
