// フックの判定ルール。入出力を持たない関数だけを置き、Vitest で確かめる。
// 本当の守りは「Cloudflare の鍵をクラウド環境に置かない」と「GitHub の main 保護」。
// ここは手違いを早めに止める2段目。

const BASH_RULES = [
  { re: /\bwrangler\b[^\n;&|]*\bdeploy\b/, reason: "本番への反映は GitHub Actions だけで行います（ship スキル参照）" },
  { re: /\bwrangler\b[^\n;&|]*\bversions\s+upload\b/, reason: "本番への反映は GitHub Actions だけで行います" },
  { re: /\bwrangler\b[^\n;&|]*--remote\b/, reason: "本番の D1 や R2 には触りません。手元では --local を使います" },
  { re: /\bwrangler\b[^\n;&|]*\bsecret\b/, reason: "本番の秘密の値は河津さんが Cloudflare の画面か手元で設定します" },
  { re: /\bwrangler\s+(?:\S+\s+){0,2}delete\b/, reason: "Cloudflare 上のものを消す操作は河津さんが行います" },
  { re: /\b(?:pnpm|npm|yarn)\s+(?:run\s+)?deploy\b/, reason: "本番への反映は GitHub Actions だけで行います" },
  {
    re: /\bgit\s+push\b[^\n;&|]*(?:\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/,
    reason: "強制的な上書きは履歴が消えるので行いません",
  },
  {
    re: /\bgit\s+push\b[^\n;&|]*\b(?:main|master)\b/,
    reason: "main へは直接入れず、作業用の枝からプルリクエストで入れます",
  },
  {
    re: /\b(?:cat|less|more|head|tail|bat|grep|rg|sed|awk|cp|mv)\b[^\n;&|]*(?:\.dev\.vars(?!\.example)|(?:^|[\s/])\.env\b)/,
    reason: "秘密の値が入ったファイル（.dev.vars / .env）は読みません。必要なら .dev.vars.example を見ます",
  },
];

const DANGEROUS_RM_TARGETS = /^(?:\/|~\/?|\$HOME\/?|\.\/?|\.\.\/?|\*|\.git\/?|.*\/\.git\/?)$/;

/** rm の再帰削除で、根こそぎ消える対象を指していないか調べる */
function checkRm(command) {
  for (const segment of command.split(/&&|\|\||;|\|/)) {
    const words = segment.trim().split(/\s+/);
    const at = words.indexOf("rm");
    if (at === -1) continue;
    const args = words.slice(at + 1);
    const recursive = args.some((a) => /^-[a-zA-Z]*[rR]/.test(a) || a === "--recursive");
    if (!recursive) continue;
    const bad = args.find((a) => !a.startsWith("-") && DANGEROUS_RM_TARGETS.test(a.replace(/^["']|["']$/g, "")));
    if (bad) return `「${bad}」の再帰削除は取り返しがつかないので止めました`;
  }
  return null;
}

/** Bash のコマンドを止めるべきなら理由を返す。通してよければ null */
export function checkBashCommand(command) {
  if (typeof command !== "string") return "コマンドを読み取れませんでした";
  for (const { re, reason } of BASH_RULES) {
    if (re.test(command)) return reason;
  }
  return checkRm(command);
}

/**
 * 書き換えを止めるべきファイルなら理由を返す。
 * @param {string} relPath リポジトリからの相対パス
 * @param {{ trackedMigration?: boolean }} info 既に記録済みのマイグレーションか
 */
export function checkEditPath(relPath, info = {}) {
  const p = relPath.replaceAll("\\", "/");
  const base = p.split("/").pop() ?? "";
  if (base === ".dev.vars" || /^\.env(?:\.|$)/.test(base)) {
    return "秘密の値が入ったファイルは編集しません。項目を足すなら .dev.vars.example を直して河津さんに伝えます";
  }
  if (base === "pnpm-lock.yaml") return "ロックファイルは手で直さず、pnpm add / pnpm remove で変えます";
  if (base === "worker-configuration.d.ts") return "この型ファイルは `pnpm typecheck`（wrangler types）で作り直します";
  if (/^migrations\/[^/]+\.sql$/.test(p) && info.trackedMigration) {
    return "記録済みのマイグレーションは書き換えません。変更は新しいマイグレーションで足します（db-migration スキル）";
  }
  return null;
}

const DESTRUCTIVE_SQL = [
  { re: /\bDROP\s+(?:TABLE|COLUMN|INDEX|VIEW|TRIGGER)\b/i, label: "DROP（削除）" },
  { re: /`?__new_\w+/i, label: "表の作り直し（__new_）" },
  { re: /\bRENAME\b/i, label: "RENAME（名前の変更）" },
  { re: /\bDELETE\s+FROM\b/i, label: "DELETE（行の削除）" },
];

/** マイグレーション SQL の中の、消える・壊れる操作を一覧で返す */
export function findDestructive(sql) {
  if (/--\s*allow-destructive:\s*\S/.test(sql)) return [];
  return DESTRUCTIVE_SQL.filter(({ re }) => re.test(sql)).map(({ label }) => label);
}

/** 型検査やテストを回す必要がある変更か（説明文だけの変更なら回さない） */
export function needsVerify(changedPaths) {
  return changedPaths.some((p) => !/\.(?:md|txt)$/i.test(p) && !p.startsWith(".claude/skills/"));
}
