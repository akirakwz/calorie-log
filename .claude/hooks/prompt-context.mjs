// UserPromptSubmit: 日本時間の日時と作業ブランチを毎回伝える（「今日」の解釈ずれを防ぐ）
import { addContext, projectDir, readInput, tryRun } from "./lib/io.mjs";

try {
  const input = await readInput();
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" });
  const branch = tryRun("git", ["branch", "--show-current"], projectDir(input)).out.trim();
  addContext("UserPromptSubmit", `いまは日本時間で ${now}。作業ブランチ: ${branch || "(不明)"}`);
} catch (err) {
  addContext("UserPromptSubmit", `日時を伝えるフックでエラーが起きました: ${err.message}`);
}
