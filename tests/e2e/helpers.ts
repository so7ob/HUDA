/**
 * مساعدات مشتركة لاختبارات E2E — محدِّدات دائمة (user-facing) وانتظارات صارمة
 * القاعدة: لا selectors هيكلية هشة — كل التفاعل عبر أدوار وأسماء واضحة للمستخدم.
 * ملاحظة: أسماء السور تُعرض بالرسم العثماني (ٱلْفَاتِحَةِ) — لا تُطابَق نصًّا عاديًّا؛
 * نعتمد الترتيب الثابت للفهرس (السورة n = الزر n) وبنية الأدوار.
 */
import { expect, type Page } from "@playwright/test";

/** كلمة مرور المدير المضبوطة في seed-e2e.ts (قاعدة E2E المعزولة فقط) */
export const E2E_ADMIN_PASSWORD = "hudae2e-admin-2025";

/** أزرار فهرس السور — تُميَّز عن أي عنصر آخر بنوع RevelationType (مكية/مدنية) */
export function surahIndexButtons(page: Page) {
  return page.getByRole("button").filter({ hasText: /مكية|مدنية/ });
}

/** فتح السورة رقم n من الفهرس (الترتيب ثابت 1..114) والانتظار حتى يجهز القارئ */
export async function openSurahByIndex(page: Page, n: number): Promise<void> {
  await page.goto("/");
  const button = surahIndexButtons(page).nth(n - 1);
  await expect(button).toBeVisible();
  await button.click();
  const reader = page.getByRole("dialog", { name: "قارئ القرآن" });
  await expect(reader).toBeVisible();
  // انتظار اكتمال تحميل الآيات (يتلاشى مؤشر التحميل)
  await expect(reader.locator(".ayah-text").first()).toBeVisible({ timeout: 20_000 });
}

/** فتح سورة الفاتحة (السورة الأولى في الفهرس) */
export async function openSurahAlFatiha(page: Page): Promise<void> {
  await openSurahByIndex(page, 1);
}

/** إغلاق القارئ والعودة إلى الرئيسية */
export async function closeReader(page: Page): Promise<void> {
  await page.getByRole("button", { name: "رجوع" }).click();
  await expect(page.getByRole("dialog", { name: "قارئ القرآن" })).toBeHidden();
}

/**
 * اعتراض CDN التلاوة الخارجي وتغذية ملف WAV صالح مُصنَّع برمجيًا —
 * يضمن سلوك تشغيل حقيقي في المتصفح دون أي وصول للشبكة الخارجية.
 */
export async function mockRecitationAudio(page: Page): Promise<void> {
  await page.route("**cdn.islamic.network/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: makeWavBytes(),
    });
  });
}

/** توليد WAV أحادي القناة ~2 ثانية (نغمة مستمرة) — بلا تبعيات ثنائية */
function makeWavBytes(): Buffer {
  const sampleRate = 8000;
  const seconds = 2;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2; // PCM 16-bit
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // حجم رأس fmt
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}
