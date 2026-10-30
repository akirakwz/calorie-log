# calorie-log

ダイエット用のカロリー・体重記録アプリ。Cloudflare Workers で動かす。いまは開発環境だけで、機能はまだ無い。

開発は Claude Code のクラウドセッションで行う。作業の決まりは `CLAUDE.md`、手順は `.claude/skills/` にある。

## はじめにやること（河津さん）

### クラウド環境

1. Claude Code のクラウド環境の設定で、Setup script に `scripts/cloud-setup.sh` の中身を貼る
2. 同じ設定に Cloudflare の API キーは置かない（本番を触れるのは GitHub Actions だけにするため）

### GitHub

1. main を保護する: 直接の push と強制上書きを禁止し、「検査」の通過を必須にする
2. Environments に `production` を作る

### Cloudflare（本番に出すとき）

1. `wrangler d1 create calorie-log` で D1 を作り、出た ID を `wrangler.jsonc` の `database_id` に入れる
2. R2 にバケット `calorie-log-images` を作る
3. API トークンを Workers、D1、R2 の編集だけに絞って作る
4. GitHub のシークレットに `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID`、変数に `DEPLOY_ENABLED=true` を入れる
5. Cloudflare Access で、使うドメインを自分だけが開けるようにする

## コマンド

| やること     | コマンド        |
| ------------ | --------------- |
| 開発サーバー | `pnpm dev`      |
| まとめて検査 | `pnpm verify`   |
| 画面テスト   | `pnpm test:e2e` |
