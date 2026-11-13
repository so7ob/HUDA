/**
 * المسار الحرج 1 — القراءة: فهرس السور ← فتح سورة ← وضع المصحف ← آخر قراءة
 */
import { expect, test } from "@playwright/test";
import { closeReader, openSurahAlFatiha, openSurahByIndex } from "./helpers";

test.describe("قراءة القرآن", () => {
  test("الصفحة الرئيسية تعرض فهرس السور الكامل", async ({ page }) => {
    await page.goto("/");

    // ترويسة الترحيب وفهرس السور
    await expect(page.getByRole("heading", { name: "القرآن الكريم" })).toBeVisible();

    // أزرار الفهرس تحمل نوع RevelationType (مكية/مدنية) — تمييز عن بطاقة آخر قراءة
    const indexButtons = page.getByRole("button").filter({ hasText: /مكية|مدنية/ });
    await expect(indexButtons.first()).toBeVisible();
    // الفهرس الكامل = 114 سورة
    await expect(indexButtons).toHaveCount(114, { timeout: 15_000 });

    // شريط البحث موجود في الرئيسية
    await expect(page.getByText("ابحث عن آية أو سورة أو موضوع…")).toBeVisible();
  });

  test("فتح سورة الفاتحة وعرض آياتها", async ({ page }) => {
    await openSurahAlFatiha(page);

    // آية الفاتحة الأولى معروضة بنص قرآني فعلي (الرسم العثماني)
    const firstAyah = page.locator("#ayah-1");
    await expect(firstAyah).toBeVisible();
    await expect(firstAyah.locator(".ayah-text")).toHaveText(/[\u0600-\u06FF]/);
  });

  test("التبديل بين وضع القائمة ووضع المصحف", async ({ page }) => {
    await openSurahAlFatiha(page);

    // التبديل إلى المصحف — عنوان القارئ يتغير إلى «المصحف — <الصفحة>»
    const reader = page.getByRole("dialog", { name: "قارئ القرآن" });
    await reader.getByRole("button", { name: "مصحف", exact: true }).click();
    await expect(reader.locator("h1")).toContainText("المصحف", { timeout: 15_000 });
    await expect(reader.locator("h1")).toContainText("١");

    // العودة إلى وضع القائمة
    await reader.getByRole("button", { name: "قائمة", exact: true }).click();
    await expect(page.locator("#ayah-1")).toBeVisible({ timeout: 15_000 });
  });

  test("إغلاق القارئ يحفظ آخر قراءة ويعرضها في الرئيسية بعد إعادة التحميل", async ({ page }) => {
    // قراءة سورة البقرة (الصفحة ٢) — تختلف عن الحالة الافتراضية (الصفحة ١)
    await openSurahByIndex(page, 2);
    await closeReader(page);

    // إعادة تحميل كاملة — آخر قراءة تُستعاد من التخزين الدائم
    await page.reload();
    const lastReadingCard = page.getByRole("button").filter({ hasText: "آخر قراءة" });
    await expect(lastReadingCard).toBeVisible();
    await expect(lastReadingCard).toContainText("الصفحة ٢");
  });
});
