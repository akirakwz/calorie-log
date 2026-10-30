// マイグレーションの SQL に、データが消えたり古いコードが動かなくなる操作が無いか調べる。
// 本番は「列や表の追加だけ」の決まり。どうしても要るときは、SQL に
// `-- allow-destructive: <理由>` と書き、河津さんの了承を取る。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findDestructive } from "../.claude/hooks/lib/rules.mjs";

const dir = new URL("../migrations/", import.meta.url).pathname;
let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
} catch (err) {
  console.error(`migrations フォルダを読めませんでした: ${err.message}`);
  process.exit(1);
}

const problems = [];
for (const file of files) {
  const sql = readFileSync(join(dir, file), "utf8");
  for (const hit of findDestructive(sql)) problems.push(`${file}: ${hit}`);
}

if (problems.length > 0) {
  console.error("消える・壊れる操作を含むマイグレーションがあります:");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("列の追加だけで書き直すか、理由を `-- allow-destructive:` で書いて了承を取ってください。");
  process.exit(1);
}
console.log(`マイグレーション検査 OK（${files.length} 件）`);
