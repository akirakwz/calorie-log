import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", ".claude/hooks/**/*.test.mjs"],
    passWithNoTests: true,
    // 日付の境目を確かめるので、実行する機械のタイムゾーンに左右されないよう固定する
    env: { TZ: "UTC" },
  },
});
