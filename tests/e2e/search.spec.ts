/**
 * المسار الحرج 2 — البحث المحلي: نتائج مجمعة + حالة عدم وجود نتائج + فتح نتيجة
 * التوسيع دائمًا داخل حوار البحث (role=dialog «البحث») لمنع التداخل مع الرئيسية.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function searchDialog(page: Page) {
  return page.getByRole("dialog", { name: "البحث" });
}

async function openSearch(page: Page) {
  await page.goto("/");
  await page.getByText("ابحث عن آية أو سورة أو موضوع…").click();
  await expect(searchDialog(page)).toBeVisible();
  await expect(page.getByPlaceholder("ابحث عن آية أو سورة أو كتاب…")).toBeVisible();
}

test.describe("البحث", () => {
  test("البحث عن كلمة قرآنية يعرض نتائج مجمعة", async ({ page }) => {
    await openSearch(page);
    await page.getByPlaceholder("ابحث عن آية أو سورة أو كتاب…").fill("الرحمن");

    // أقسام النتائج المجمعة — قسم واحد على الأقل مع أزرار نتائج قابلة للنقر
    const dialog = searchDialog(page);
    const sections = dialog.locator("section");
    await expect(sections.first()).toBeVisible({ timeout: 15_000 });
    const resultButtons = sections.first().getByRole("button");
    await expect(resultButtons.first()).toBeVisible();
    expect(await resultButtons.count()).toBeGreaterThan(0);
  });

  test("البحث الاعتباطي يعرض حالة لا توجد نتائج", async ({ page }) => {
    await openSearch(page);
    await page.getByPlaceholder("ابحث عن آية أو سورة أو كتاب…").fill("زلزولةس غير موجودة");

    await expect(searchDialog(page).getByText("لا توجد نتائج")).toBeVisible({ timeout: 15_000 });
  });

  test("فتح نتيجة بحث يفتح القارئ", async ({ page }) => {
    await openSearch(page);
    await page.getByPlaceholder("ابحث عن آية أو سورة أو كتاب…").fill("الرحمن");

    const dialog = searchDialog(page);
    const firstResult = dialog.locator("section").first().getByRole("button").first();
    await expect(firstResult).toBeVisible({ timeout: 15_000 });
    await firstResult.click();

    // نتيجة آية/سورة تفتح قارئ القرآن
    await expect(page.getByRole("dialog", { name: "قارئ القرآن" })).toBeVisible();
  });
});
