import { expect, test } from "@playwright/test";

// 開発環境の確認用。開発サーバーが立ち、画面と API が応答するか
test("画面と API が応答する", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "カロリー記録" })).toBeVisible();
  await page.screenshot({ path: "test-results/top.png", fullPage: true });

  const res = await request.get("/api/health");
  expect(await res.json()).toEqual({ ok: true });
});
