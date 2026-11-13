/**
 * المسار الحرج 3 — المفضلة: إضافة آية + استمرارية عبر إعادة تحميل الجلسة كاملة + الإزالة
 * (الاستمرارية = كتابة في التخزين الدائم عبر الـ API ثم قراءتها في جلسة نظيفة)
 * التحقق عبر عدّاد تبويب المفضلة وأزرار الحذف — بلا اعتماد على نصوص الرسم العثماني.
 * كل اختبار يُنهي بحالة نظيفة (قائمة فارغة) ليكون كلاهما مستقلًا ومتسلسلًا آمنًا.
 */
import { expect, test } from "@playwright/test";
import { closeReader, openSurahAlFatiha } from "./helpers";

function favoritesDialog(page: import("@playwright/test").Page) {
  return page.getByRole("dialog", { name: "المفضلة والعلامات المرجعية" });
}

function favoritesTab(page: import("@playwright/test").Page) {
  return favoritesDialog(page).getByRole("tab", { name: /المفضلة/ });
}

async function openFavoritesFromHome(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "المفضلة", exact: true }).click();
  await expect(favoritesDialog(page)).toBeVisible();
}

/**
 * إغلاق درج إجراءات الآية (Escape) — الدرج يبقى مفتوحًا بعد الإضافة/الإزالة
 * ويحجب شجرة الوصول للقارئ (aria-hidden خارج نافذة Radix) —
 * يجب إغلاقه قبل «رجوع» وإلا لن يجد زر الرجوع في شجرة الوصول.
 */
async function closeAyahDrawer(page: import("@playwright/test").Page) {
  await page.keyboard.press("Escape");
  // عناصر الدرج تُحذف من الشجرة بعد إغلاقه (vaul يزيل المحتوى بعد الحركة)
  await expect(page.locator("[data-vaul-drawer]")).toBeHidden({ timeout: 10_000 });
}

test.describe("المفضلة والاستمرارية", () => {
  test("إضافة آية للمفضلة تستمر بعد إعادة تحميل الصفحة ثم تُزال من الدرج", async ({ page }) => {
    // 1) فتح الفاتحة وإضافة الآية الأولى للمفضلة
    await openSurahAlFatiha(page);
    await page.locator("#ayah-1").click();
    const favButton = page.getByRole("button", { name: "إضافة للمفضلة" });
    await expect(favButton).toBeVisible();
    await favButton.click();
    await expect(page.getByText("أُضيفت إلى المفضلة")).toBeVisible({ timeout: 10_000 });
    await closeAyahDrawer(page);
    await closeReader(page);

    // 2) إعادة تحميل كاملة — محاكاة جلسة جديدة تقرأ من التخزين الدائم
    await page.reload();
    await expect(page.getByRole("heading", { name: "القرآن الكريم" })).toBeVisible();
    await openFavoritesFromHome(page);
    await expect(favoritesTab(page)).toContainText("(١)");
    await expect(favoritesDialog(page).getByRole("button", { name: /^حذف:/ })).toHaveCount(1);

    // 3) العودة للقارئ: الزر تحوّل إلى «إزالة من المفضلة» — الإزالة من الدرج تعمل
    await favoritesDialog(page).getByRole("button", { name: "رجوع" }).click();
    await expect(favoritesDialog(page)).toBeHidden();
    await openSurahAlFatiha(page);
    await page.locator("#ayah-1").click();
    const removeButton = page.getByRole("button", { name: "إزالة من المفضلة" });
    await expect(removeButton).toBeVisible({ timeout: 10_000 });
    await removeButton.click();
    await expect(page.getByText("أُزيلت من المفضلة")).toBeVisible({ timeout: 10_000 });
    await closeAyahDrawer(page);
    await closeReader(page);
  });

  test("إزالة آية من شاشة المفضلة تعمل وتُحدث العدّاد", async ({ page }) => {
    // تهيئة مستقلة: إضافة آية أولًا (الحالة الافتتاحية نظيفة دائمًا)
    await openSurahAlFatiha(page);
    await page.locator("#ayah-1").click();
    await page.getByRole("button", { name: "إضافة للمفضلة" }).click();
    await expect(page.getByText("أُضيفت إلى المفضلة")).toBeVisible({ timeout: 10_000 });
    await closeAyahDrawer(page);
    await closeReader(page);

    // فتح شاشة المفضلة: عنصر واحد
    await openFavoritesFromHome(page);
    await expect(favoritesTab(page)).toContainText("(١)");

    // الحذف من الشاشة (زر الحذف يحمل aria-label «حذف: …»)
    await favoritesDialog(page).getByRole("button", { name: /^حذف:/ }).first().click();
    await expect(page.getByText("أُزيلت من المفضلة")).toBeVisible({ timeout: 10_000 });

    // العدّاد يصفو ولا عناصر متبقية
    await expect(favoritesTab(page)).not.toContainText("(١)", { timeout: 10_000 });
    await expect(favoritesDialog(page).getByRole("button", { name: /^حذف:/ })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
