#!/usr/bin/env bash
# カロリー記録アプリ用 クラウド環境のセットアップスクリプト
# 置き場: Claude Code のクラウド環境の設定 → Setup script に中身を貼り付ける（これは写し）
# 注意: このスクリプトからは環境変数やシークレットを読めない（API キーは使わない）
set -euo pipefail

fail() {
  echo "[setup] 失敗: $1" >&2
  exit 1
}

echo "[setup] 開始"

# 1. Node のバージョン確認（Cloudflare の開発ツールは Node 20 以上が必要）
command -v node >/dev/null || fail "node が見つかりません。環境に Node.js が入っているか確認してください"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node が古すぎます（今: $(node -v)、必要: 20 以上）"
echo "[setup] Node $(node -v)"

# 2. pnpm を使える状態にする
if ! command -v pnpm >/dev/null; then
  corepack enable || fail "corepack で pnpm を有効にできませんでした"
fi
echo "[setup] pnpm $(pnpm -v)"

# 3. wrangler の利用状況の送信を止める
mkdir -p "$HOME/.config/.wrangler"
export WRANGLER_SEND_METRICS=false

# 4. リポジトリが取り込まれていれば依存を入れる（無ければ何もしない）
REPO_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
if [ -f "$REPO_DIR/package.json" ]; then
  cd "$REPO_DIR"
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile \
      || fail "依存のインストールに失敗。pnpm-lock.yaml と package.json がずれていないか確認してください"
  else
    pnpm install || fail "依存のインストールに失敗しました"
  fi

  # 5. Playwright の版がコンテナに入っている Chromium と合っているか確認
  PREINSTALLED_PW="$(node -e "console.log(require('$(npm root -g)/playwright/package.json').version)" 2>/dev/null || true)"
  PROJECT_PW="$(node -e "console.log(require('@playwright/test/package.json').version)" 2>/dev/null || true)"
  if [ -n "$PREINSTALLED_PW" ] && [ -n "$PROJECT_PW" ] && [ "$PREINSTALLED_PW" != "$PROJECT_PW" ]; then
    echo "[setup] 警告: @playwright/test が $PROJECT_PW、コンテナは $PREINSTALLED_PW。画面テストのブラウザが見つからない可能性があります" >&2
  fi
else
  echo "[setup] package.json が無いので依存のインストールは飛ばします（リポジトリ作成直後）"
fi

echo "[setup] 完了"
