# الخطوة التالية — نقطة الاستئناف

> حدّث هذا الملف آخر شيء قبل توقف أي جلسة. اقرأه أولًا عند بدء جلسة جديدة.

## الحالة المؤكدة الآن (دورة 1 مكتملة)

- الفرع الحالي: `dev/audit-p0` — محليًا. المرجع: `huda-web-app` (02a98c0 على GitHub)
- آخر عمل: 6 إصلاحات P0 (بناء/أمن/بحث) + 22 اختبار وحدة + 4 سجلات E2E حي
- الفحوص عند آخر تشغيل: bun test 22/22، tsc EXIT 0، lint نظيف
- البيئة: خادم dev يعمل على :3000؛ sandbox قد يعيد الضبط ويحذف غير المتتبَّع — كل شيء متتبَّع الآن

## الخطوة التالية المطلوبة (الدورة 2)

1. دمج PR#1 في huda-web-app ثم `git checkout huda-web-app && git pull`
2. إنشاء فرع `dev/offline-pwa` والبدء بـ Issue #7: Service Worker (cache fonts + static + صفحات مصحف مشهودة + manifest icons)
3. بعده مباشرة Issue #8: تنزيل التلاوات إلى IndexedDB + تشغيل دون شبكة
4. ثم Issue #4: اختبارات E2E Playwright للمسارات الحرجة

## أوامر الاستئناف السريعة

```bash
cd /home/z/my-project
git fetch origin && git checkout huda-web-app && git pull origin huda-web-app
git checkout -b dev/offline-pwa
bun install && bunx prisma generate && bun run dev   # الخادم على :3000
bun test   # يجب أن يبقى 22/22 خضراء قبل أي تغيير
```

## ملاحظات بيئية حرجة

- الرمز GitHub للعمليات: استخدم الرمز المرفق في المحادثة (حساب wweziz000) — لا تضعه في أي ملف
- عند إعادة ضبط البيئة: استعد من git (كل الملفات متتبَّعة في main المحلي أيضًا)
- لا تستخدم `bun run build` في هذه البيئة — الخادم dev فقط
