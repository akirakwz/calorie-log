// SessionStart(startup): 手元の準備を整え、いまの状態を最初に伝える
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { addContext, projectDir, readInput, tail, tryRun } from "./lib/io.mjs";

try {
  const input = await readInput();
  const dir = projectDir(input);
  const lines = [];

  if (!existsSync(join(dir, "node_modules"))) {
    lines.push(
      "依存が入っていません。クラウド環境のセットアップスクリプトが失敗した可能性があります。`pnpm install --frozen-lockfile` を実行してください。",
    );
  }

  // 開発用の設定ファイルが無ければ見本から作る（中身は秘密ではない開発用の値だけ）
  const devVars = join(dir, ".dev.vars");
  if (!existsSync(devVars) && existsSync(join(dir, ".dev.vars.example"))) {
    copyFileSync(join(dir, ".dev.vars.example"), devVars);
    lines.push(".dev.vars を .dev.vars.example から作りました。");
  }

  if (existsSync(join(dir, "node_modules"))) {
    const mig = tryRun("pnpm", ["db:migrate:local"], dir, 50_000);
    lines.push(
      mig.ok
        ? "手元の D1 にマイグレーションを当てました。"
        : `手元の D1 へのマイグレーションに失敗しました:\n${tail(mig.out, 15)}`,
    );
  }

  const branch = tryRun("git", ["branch", "--show-current"], dir).out.trim();
  const dirty = tryRun("git", ["status", "--porcelain"], dir).out.split("\n").filter(Boolean).length;
  lines.push(`いまの作業ブランチ: ${branch || "(不明)"}、未保存の変更: ${dirty} 件`);
  lines.push("作業の手順はスキル（add-feature / db-migration / ui-check / ship）にあります。");

  addContext("SessionStart", lines.join("\n"));
} catch (err) {
  addContext("SessionStart", `開始時の準備フックでエラーが起きました: ${err.message}`);
}
