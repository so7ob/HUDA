# الخطوة التالية — نقطة الاستئناف

> حدّث هذا الملف آخر شيء قبل توقف أي جلسة. اقرأه أولًا عند بدء جلسة جديدة.

## الحالة المؤكدة الآن (دورة 1 مكتملة ومدمجة)

- **PR #1 مدمج في `huda-web-app`** (merge commit `96e483f`) — الفرع المرجعي تقدم من 02a98c0 إلى 96e483f
- القضايا المنجزة والمغلقة: #2 حدّ المحاولات، #3 كلمة المرور الافتراضية+الكوكي الآمن، #4 ignoreBuildErrors+انهيار الفصول، #5 db:push آمن، #6 الألف الخنجرية والمطابقة المرنة، #7 اختبارات الوحدة
- القضايا المفتوحة: #8 Service Worker، #9 تنزيل التلاوات، #10 اختبارات E2E، #11 rate-limit SQLite، #12 فهرس البحث
- الفحوص عند آخر تشغيل: bun test 22/22، tsc EXIT 0، lint نظيف، E2E حي موثق في QUALITY_REPORT.md
- البيئة: خادم dev يعمل على :3000؛ البيئة قد تحول HEAD إلى main محليًا — استخدم `git branch -f` + الدفع بالاسم الصريح دائمًا

## الخطوة التالية المطلوبة (الدورة 2 — Issue #8)

1. إنشاء فرع `dev/offline-pwa` من huda-web-app (96e483f)
2. Service Worker: تخزين shell + خطوط المصحف + صفحات المصحف المشاهدة + قوائم، stale-while-revalidate للـ static، network-first للـ API التفاعلية، إدارة إصدار الكاش
3. تسجيل SW في layout + صفحة إدارة التخزين في الإعدادات
4. الاختبار الحاسم: إيقاف الخادم تمامًا ← التصفح المشاهد يعمل (متصفح offline)
5. بعده مباشرة: Issue #9 تنزيل التلاوات إلى IndexedDB

## أوامر الاستئناف السريعة

```bash
cd /home/z/my-project
git fetch origin && git checkout huda-web-app   # أو: git branch -f dev/... origin/huda-web-app
git checkout -b dev/offline-pwa huda-web-app
bun install && bunx prisma generate && bun run dev
bun test   # 22/22 خضراء قبل أي تغيير — أي انحراف يعني تراجعًا
```

## ملاحظات بيئية حرجة

- الرمز GitHub: من المحادثة (حساب wweziz000) — لا يُكتب في أي ملف، يُمرَّر عبر env فقط
- عند إعادة ضبط البيئة: كل الملفات متتبَّعة في main المحلي أيضًا — استعد من git
- لا `bun run build` — الخادم dev فقط
- القضايا تُغلق يدويًا بعد الدمج على huda-web-app (الفرع غير الافتراضي)
