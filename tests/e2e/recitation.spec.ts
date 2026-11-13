/**
 * المسار الحرج 5 — تشغيل التلاوة (محاكاة):
 * اعتراض CDN التلاوة الخارجي وتغذية WAV صالح — إثبات تشغيل صوتي حقيقي في المتصفح
 * عبر window.__hudaAudio (متاح في وضع التطوير فقط).
 * نقرات Playwright نقرات حقيقية تمنح إذن autoplay — لا حاجة لأي تجاوز.
 * ملاحظة: عند بدء التشغيل يظهر المشغّل المصغّر (زر «إيقاف») ويختفي الزر العائم.
 */
import { expect, test } from "@playwright/test";
import { mockRecitationAudio, openSurahAlFatiha } from "./helpers";

/** الانتظار حتى يعمل الصوت فعليًا (محمّل، غير متوقف، الزمن يتقدم) */
async function expectAudioPlaying(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => {
      const audio = (window as unknown as { __hudaAudio?: HTMLAudioElement }).__hudaAudio;
      return audio !== undefined && !audio.paused && audio.currentTime > 0;
    },
    { timeout: 20_000, polling: 250 }
  );
}

async function expectAudioPaused(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => {
      const audio = (window as unknown as { __hudaAudio?: HTMLAudioElement }).__hudaAudio;
      return audio !== undefined && audio.paused;
    },
    { timeout: 10_000, polling: 250 }
  );
}

test.describe("تشغيل التلاوة", () => {
  test("تشغيل تلاوة السورة يبدأ صوتًا فعليًا ويظهر المشغّل المصغّر", async ({ page }) => {
    // 1) اعتراض الشبكة الخارجية قبل أي تنقل
    await mockRecitationAudio(page);

    // 2) فتح الفاتحة وبدء تشغيل السورة من الزر العائم
    await openSurahAlFatiha(page);
    await page.getByRole("button", { name: "تشغيل تلاوة السورة" }).click();

    // 3) المشغّل المصغّر يظهر بزر «إيقاف» — الزر العائم يختفي
    const pauseButton = page.getByRole("button", { name: "إيقاف", exact: true });
    await expect(pauseButton).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "تشغيل تلاوة السورة" })).toBeHidden();

    // 4) الإثبات الحاسم: عنصر الصوت يعمل فعلًا
    await expectAudioPlaying(page);

    // 5) الإيقاف يعمل — الصوت يتوقف والزر يتحول إلى «تشغيل»
    await pauseButton.click();
    await expectAudioPaused(page);
    await expect(page.getByRole("button", { name: "تشغيل", exact: true })).toBeVisible();
  });

  test("تشغيل آية مفردة من قائمة إجراءات الآية", async ({ page }) => {
    await mockRecitationAudio(page);
    await openSurahAlFatiha(page);

    // فتح إجراءات الآية الأولى ثم «تشغيل الآية»
    await page.locator("#ayah-1").click();
    await page.getByRole("button", { name: "تشغيل الآية" }).click();

    const pauseButton = page.getByRole("button", { name: "إيقاف", exact: true });
    await expect(pauseButton).toBeVisible({ timeout: 15_000 });
    await expectAudioPlaying(page);
  });
});
