import { describe, expect, it } from "vitest";
import { checkBashCommand, checkEditPath, findDestructive, needsVerify } from "./rules.mjs";

describe("checkBashCommand", () => {
  it.each([
    "pnpm wrangler deploy",
    "npx wrangler deploy --env production",
    "wrangler versions upload",
    "pnpm wrangler d1 migrations apply DB --remote",
    "wrangler d1 execute DB --remote --command 'select 1'",
    "echo x | wrangler secret put ANTHROPIC_API_KEY",
    "wrangler d1 delete calorie-log",
    "wrangler r2 bucket delete calorie-log-images",
    "pnpm run deploy",
    "npm deploy",
    "git push --force origin feature",
    "git push -f",
    "git push origin +feature",
    "git push origin HEAD:main",
    "git push origin main",
    "cat .dev.vars",
    "grep KEY .env",
    "rm -rf /",
    "rm -rf ~",
    "rm -fr .git",
    "cd x && rm -r .",
  ])("止める: %s", (cmd) => {
    expect(checkBashCommand(cmd)).not.toBeNull();
  });

  it.each([
    "pnpm dev",
    "pnpm verify",
    "pnpm db:migrate:local",
    "pnpm wrangler d1 execute DB --local --command 'select * from records'",
    "git push -u origin claude/add-weight-form",
    "cat .dev.vars.example",
    "rm -rf node_modules dist .wrangler",
    "rm -rf test-results",
  ])("通す: %s", (cmd) => {
    expect(checkBashCommand(cmd)).toBeNull();
  });
});

describe("checkEditPath", () => {
  it("秘密のファイルとロックファイルと生成物は止める", () => {
    expect(checkEditPath(".dev.vars")).not.toBeNull();
    expect(checkEditPath(".env.local")).not.toBeNull();
    expect(checkEditPath("pnpm-lock.yaml")).not.toBeNull();
    expect(checkEditPath("worker-configuration.d.ts")).not.toBeNull();
  });

  it("記録済みのマイグレーションだけ止める", () => {
    expect(checkEditPath("migrations/0001_init.sql", { trackedMigration: true })).not.toBeNull();
    expect(checkEditPath("migrations/0002_new.sql", { trackedMigration: false })).toBeNull();
    expect(checkEditPath("migrations/meta/_journal.json", { trackedMigration: true })).toBeNull();
  });

  it("見本ファイルと普通のコードは通す", () => {
    expect(checkEditPath(".dev.vars.example")).toBeNull();
    expect(checkEditPath("src/worker/app.ts")).toBeNull();
  });
});

describe("findDestructive", () => {
  it("列の追加は通す", () => {
    expect(findDestructive("ALTER TABLE `records` ADD `steps` integer;")).toEqual([]);
  });

  it("drizzle の作り直しや削除は見つける", () => {
    const sql =
      "CREATE TABLE `__new_records` (...);\nDROP TABLE `records`;\nALTER TABLE `__new_records` RENAME TO `records`;";
    expect(findDestructive(sql)).toEqual(["DROP（削除）", "表の作り直し（__new_）", "RENAME（名前の変更）"]);
  });

  it("理由が書いてあれば通す", () => {
    expect(findDestructive("-- allow-destructive: 河津さん了承済み\nDROP TABLE `tmp`;")).toEqual([]);
  });
});

describe("needsVerify", () => {
  it("説明文だけの変更では回さない", () => {
    expect(needsVerify(["README.md", ".claude/skills/ship/SKILL.md"])).toBe(false);
    expect(needsVerify(["README.md", "src/worker/app.ts"])).toBe(true);
  });
});
