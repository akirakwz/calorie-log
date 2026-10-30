import { defineConfig } from "drizzle-kit";

// 出力先は wrangler.jsonc の migrations_dir と揃える
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/worker/db/schema.ts",
  out: "./migrations",
});
