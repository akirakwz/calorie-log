// PostToolUse(Edit|Write): 書いたファイルを整形し、残った指摘と次にやることを伝える

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { addContext, projectDir, readInput, respond, tail, tryRun } from "./lib/io.mjs";
import { findDestructive } from "./lib/rules.mjs";

const BIOME_TARGET = /\.(?:[cm]?[jt]sx?|json|jsonc|css)$/;

try {
  const input = await readInput();
  const dir = projectDir(input);
  const filePath = input?.tool_input?.file_path;
  if (!filePath) process.exit(0);
  const rel = relative(dir, filePath);
  const notes = [];

  // マイグレーションに消える操作が入っていたら、すぐ直させる
  if (/^migrations\/[^/]+\.sql$/.test(rel)) {
    const hits = findDestructive(readFileSync(filePath, "utf8"));
    if (hits.length > 0) {
      respond({
        decision: "block",
        reason: `${rel} に ${hits.join("、")} が入っています。本番は列や表の追加だけの決まりです。db-migration スキルの手順で書き直してください。`,
      });
    }
  }

  if (rel === "src/worker/db/schema.ts") {
    notes.push(
      "テーブル定義を変えたので、`pnpm db:generate` でマイグレーションを作り、`pnpm db:migrate:local` で手元に当ててください（db-migration スキル）。",
    );
  }

  if (BIOME_TARGET.test(rel) && !rel.startsWith("migrations/meta/")) {
    const res = tryRun("pnpm", ["exec", "biome", "check", "--write", rel], dir);
    if (!res.ok) notes.push(`Biome の指摘が残っています（${rel}）:\n${tail(res.out, 30)}`);
  }

  if (notes.length > 0) addContext("PostToolUse", notes.join("\n\n"));
  process.exit(0);
} catch (err) {
  addContext("PostToolUse", `編集後の確認フックでエラーが起きました: ${err.message}`);
}
