// PreToolUse(Bash): 本番に効くコマンドや、取り返しのつかないコマンドを止める
import { readInput, respond } from "./lib/io.mjs";
import { checkBashCommand } from "./lib/rules.mjs";

function deny(reason) {
  respond({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `安全のため止めました: ${reason}`,
    },
  });
}

try {
  const input = await readInput();
  const reason = checkBashCommand(input?.tool_input?.command);
  if (reason) deny(reason);
  process.exit(0);
} catch (err) {
  // 判定できないときは通さない
  deny(`コマンドの確認に失敗しました（${err.message}）`);
}
