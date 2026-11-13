/**
 * تهيئة قاعدة بيانات E2E — تُنفَّذ بـ bun (عملية منفصلة من global-setup)
 *
 * 1) نسخ db/custom.db (المحتوى المرجعي الكامل: 114 سورة، 6236 آية، مقرئون، كتب)
 *    إلى db/e2e.db — قاعدة نظيفة لكل تشغيل (حتمية 100%)
 * 2) تصفير بيانات الاستخدام الشخصية (المفضلة/العلامات/آخر قراءة/التنزيلات/الجلسات)
 * 3) ضبط كلمة مرور المدير admin على قيمة E2E معلومة (تجزئة scrypt مطابقة لـ hashPassword)
 */
import { Database } from "bun:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

export const E2E_ADMIN_PASSWORD = "hudae2e-admin-2025";

function main() {
  const root = process.cwd();
  const src = path.join(root, "db", "custom.db");
  const dst = path.join(root, "db", "e2e.db");

  if (!existsSync(src)) {
    console.error(`[seed-e2e] مصدر القاعدة غير موجود: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dst);

  const db = new Database(dst);

  // تصفير بيانات الاستخدام الشخصية — حتمية الاختبارات
  db.run("DELETE FROM Favorite");
  db.run("DELETE FROM Bookmark");
  db.run("DELETE FROM LastReading");
  db.run("DELETE FROM LastBookRead");
  db.run("DELETE FROM DownloadedRecitation");
  db.run("DELETE FROM AdminSession");

  // كلمة مرور إدارة معلومة — مطابقة لمنطق hashPassword في src/lib/admin-auth.ts
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(E2E_ADMIN_PASSWORD, salt, 64).toString("hex");
  db.prepare("UPDATE AdminUser SET passwordHash = ?, salt = ? WHERE username = 'admin'").run(hash, salt);

  const admin = db.query("SELECT username, role FROM AdminUser WHERE username = 'admin'").get() as
    | { username: string; role: string }
    | null;
  if (!admin) {
    console.error("[seed-e2e] مستخدم admin غير موجود بعد التهيئة");
    process.exit(1);
  }

  const counts = {
    ayahs: (db.query("SELECT COUNT(*) c FROM QuranAyah").get() as { c: number }).c,
    surahs: (db.query("SELECT COUNT(*) c FROM QuranSurah").get() as { c: number }).c,
    reciters: (db.query("SELECT COUNT(*) c FROM Reciter").get() as { c: number }).c,
  };
  db.close();

  console.log(
    `[seed-e2e] db/e2e.db جاهزة — admin=${admin.username}/${admin.role} ayahs=${counts.ayahs} surahs=${counts.surahs} reciters=${counts.reciters}`
  );
  if (counts.ayahs < 6000) {
    console.error("[seed-e2e] المحتوى المرجعي ناقص — تحقق من db/custom.db");
    process.exit(1);
  }
}

main();
