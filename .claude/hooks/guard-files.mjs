// PreToolUse(Edit|Write|NotebookEdit): 秘密のファイル、ロックファイル、記録済みのマイグレーションを守る
import { relative } from "node:path";
import { projectDir, readInput, respond, tryRun } from "./lib/io.mjs";
import { checkEditPath } from "./lib/rules.mjs";

function deny(reason) {
  respond({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `このファイルは編集しません: ${reason}`,
    },
  });
}

try {
  const input = await readInput();
  const dir = projectDir(input);
  const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (!filePath) process.exit(0);
  const rel = relative(dir, filePath);
  // 記録済み（main などに入った）マイグレーションかどうかを git で確かめる
  const trackedMigration = rel.startsWith("migrations/") && tryRun("git", ["ls-files", "--error-unmatch", rel], dir).ok;
  const reason = checkEditPath(rel, { trackedMigration });
  if (reason) deny(reason);
  process.exit(0);
} catch (err) {
  deny(`ファイルの確認に失敗しました（${err.message}）`);
}
