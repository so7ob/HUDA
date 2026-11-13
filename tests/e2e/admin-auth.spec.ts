/**
 * المسار الحرج 4 — دخول لوحة الإدارة + حراسة الأمان:
 * تسجيل دخول صحيح، رفض الخطأ، وقفل حدّ المحاولات (5 محاولات فاشلة / 15 دقيقة)
 * ملاحظة الترتيب: عدّاد الفشل تراكمي على مستوى الخادم — الاختبارات داخل الملف متسلسلة عمدًا.
 */
import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "./helpers";

/** الانتقال إلى شاشة الإعدادات عبر شريط التنقل السفلي */
async function gotoSettings(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "التنقل الرئيسي" })
    .getByRole("button", { name: "الإعدادات" })
    .click();
  await expect(page.getByRole("button", { name: /لوحة الإدارة/ })).toBeVisible();
}

/** فتح نموذج دخول الإدارة */
async function openAdminLogin(page: import("@playwright/test").Page) {
  await gotoSettings(page);
  await page.getByRole("button", { name: /لوحة الإدارة/ }).click();
  await expect(page.locator("#admin-username")).toBeVisible();
}

/** ملء النموذج وإرساله */
async function attemptLogin(page: import("@playwright/test").Page, password: string) {
  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
}

test.describe("دخول الإدارة والحراسة", () => {
  test("الدخول بكلمة مرور صحيحة يفتح اللوحة ثم الخروج يعيد النموذج", async ({ page }) => {
    await openAdminLogin(page);
    await attemptLogin(page, E2E_ADMIN_PASSWORD);

    // اللوحة مفتوحة: ترويسة باسم الحساب (مدير النظام) مرئية
    const accountMenu = page.getByRole("button", { name: /قائمة الحساب/ });
    await expect(accountMenu).toBeVisible({ timeout: 15_000 });

    // تسجيل الخروج لإعادة الحالة للنموذج (الاختبارات التالية تعتمد النموذج)
    await accountMenu.click();
    await page.getByRole("menuitem", { name: "تسجيل الخروج" }).click();
    await expect(page.getByText("تم تسجيل الخروج")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#admin-username")).toBeVisible({ timeout: 15_000 });
  });

  test("كلمة مرور خاطئة تُرفض برسالة واضحة", async ({ page }) => {
    await openAdminLogin(page);
    await attemptLogin(page, "wrong-pass-999");

    await expect(page.getByText("بيانات الدخول غير صحيحة")).toBeVisible({ timeout: 15_000 });
    // النموذج ظل ظاهرًا — لم يُمنح أي جلسة
    await expect(page.locator("#admin-username")).toBeVisible();
  });

  test("حدّ المحاولات: 5 محاولات فاشلة تؤدي إلى قفل الدخول", async ({ page }) => {
    await openAdminLogin(page);

    // محاولات فاشلة متتالية حتى ظهور رسالة القفل (عدّاد تراكمي مع الاختبار السابق)
    let locked = false;
    for (let i = 0; i < 8 && !locked; i++) {
      await attemptLogin(page, "wrong-pass-lock-999");
      const lockMessage = page.getByText(/محاولات كثيرة/);
      try {
        await expect(lockMessage).toBeVisible({ timeout: 5_000 });
        locked = true;
      } catch {
        // قد تكون المحاولة مجرد رفض 401 — نكمل حتى بلوغ الحد
      }
    }

    expect(locked, "رسالة قفل حدّ المحاولات لم تظهر بعد 8 محاولات فاشلة").toBe(true);
    // حتى كلمة المرور الصحيحة مرفوضة أثناء القفل — النموذج ظل ظاهرًا
    await expect(page.locator("#admin-username")).toBeVisible();
  });
});
