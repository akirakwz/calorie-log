// フック共通の入出力
import { execFileSync } from "node:child_process";

/** 標準入力の JSON を読む。壊れていたら理由つきで投げる */
export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`フックへの入力を JSON として読めませんでした: ${err.message}`);
  }
}

export function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
}

/** 結果を JSON で返して終わる */
export function respond(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

/** 文脈に文を足す */
export function addContext(hookEventName, text) {
  respond({ hookSpecificOutput: { hookEventName, additionalContext: text } });
}

/** コマンドを実行して標準出力を返す。失敗したら例外 */
export function run(cmd, args, cwd, timeoutMs = 60_000) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] });
}

/** 失敗しても止めずに、結果と出力を返す */
export function tryRun(cmd, args, cwd, timeoutMs = 60_000) {
  try {
    return { ok: true, out: run(cmd, args, cwd, timeoutMs) };
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() || err.message;
    return { ok: false, out };
  }
}

export function tail(text, lines = 40) {
  return text.split("\n").slice(-lines).join("\n");
}
