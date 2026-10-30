// Stop: 変更があれば `pnpm verify`（型・lint・マイグレーション検査・テスト）を回し、
// 失敗していたら終わらせずに直させる。同じ中身で一度通っていれば回さない。
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectDir, readInput, respond, tail, tryRun } from "./lib/io.mjs";
import { needsVerify } from "./lib/rules.mjs";

try {
  const input = await readInput();
  // 一度止めて直させたあとは、二度目は止めない（無限に続かないように）
  if (input?.stop_hook_active) process.exit(0);

  const dir = projectDir(input);
  const status = tryRun("git", ["status", "--porcelain", "-uall"], dir);
  if (!status.ok) {
    respond({ systemMessage: `変更の確認に失敗したので検査を飛ばしました: ${status.out}` });
  }
  const changed = status.out
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));
  if (!needsVerify(changed)) process.exit(0);

  // 中身が前回通ったときと同じなら回さない
  const diff = tryRun("git", ["diff", "HEAD"], dir).out;
  const hash = createHash("sha256").update(status.out).update(diff).digest("hex");
  const cacheDir = join(dir, ".claude/.cache");
  const cacheFile = join(cacheDir, "last-verified");
  let last = "";
  try {
    last = readFileSync(cacheFile, "utf8");
  } catch {
    // 初回はまだ記録が無い
  }
  if (last === hash) process.exit(0);

  const result = tryRun("pnpm", ["verify"], dir, 280_000);
  if (!result.ok) {
    respond({
      decision: "block",
      reason: `\`pnpm verify\` が失敗しています。直してから終わってください。\n\n${tail(result.out, 60)}`,
    });
  }
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, hash);
  process.exit(0);
} catch (err) {
  respond({ systemMessage: `終了前の検査フックでエラーが起きました: ${err.message}` });
}
