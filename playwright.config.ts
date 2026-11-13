import { defineConfig, devices } from "@playwright/test";

/**
 * إعدادات اختبارات E2E — المسارات الحرجة (Issue #10)
 *
 * مبدأ العزل الكامل:
 * - خادم Next مستقل على منفذ 3105 (لا يتعارض مع خادم المعاينة 3000)
 * - قاعدة بيانات مخصصة db/e2e.db تُبنى في global-setup من نسخة المحتوى المرجعي
 *   مع تصفير بيانات الاستخدام الشخصية وكلمة مرور إدارة معلومة
 * - تلاوة الصوت تُحاكي باعتراض نطاق CDN — لا اعتماد على الشبكة الخارجية
 */

const PORT = Number(process.env.E2E_PORT ?? 3105);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  /* المسارات الحرجة تتقاسم قاعدة بيانات واحدة — تشغيل متسلسل صارم لمنع التداخل */
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "ar",
    timezoneId: "Asia/Riyadh",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `bunx next dev -p ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: "file:../db/e2e.db",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
