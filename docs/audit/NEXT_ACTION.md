# الخطوة التالية — نقطة الاستئناف

> حدّث هذا الملف آخر شيء قبل توقف أي جلسة. اقرأه أولًا عند بدء جلسة جديدة.

## الهيكل الجديد المعتمد (الدورة 3 — إعادة هيكلة المستودع)

- **main = الإنتاج**: آخر إصدار مستقر فقط؛ النشر منه حصرياً بعد Tag + GitHub Release.
- **develop = التكامل**: أُنشئ من main الجديد بعد الترحيل؛ كل فروع العمل تنشأ منه وتعود إليه عبر PR + CI.
- **huda-web-app لم يعد فرع تطوير** — تاريخه محفوظ، وأرشيفه: `archive/huda-before-migration` = `dd1dca0`.
- `archive/main-before-migration` = `72af83b` (main القديم قبل الترحيل).
- commit الترحيل (دمج التواريخ غير المرتبطة): `292794c` — الأبوين `72af83b` + `dd1dca0`.

### حالة الدورة 3 الحية
- PR الترحيل `integration/bootstrap-main` → `main`: [يُحدَّث بالرقم وSHA الدمج بعد الدمج]
- `develop`: [يُحدَّث بـ SHA الإنشاء]
- PR الوثائق (اختبار دورة develop): [يُحدَّث]
- Release PR (SemVer + tag): [يُحدَّث]
- حماية الفروع: [يُحدَّث بعد محاولة الإعداد]

## القواعد الحاكمة (غير قابلة للتفاوض)

1. لا كتابة مباشرة في `main` أو `develop` — دائماً عبر PR مع CI أخضر.
2. لا force push على main/develop، لا حذف تاريخ، لا إعادة إنشاء المستودع.
3. فروع العمل دائماً من `origin/develop` المحدّث: `feature/*` `fix/*` `refactor/*` `perf/*` `test/*` `chore/*`؛ والإصلاح الإنتاجي `hotfix/*` من `main` ثم يعود إلى develop أيضاً.
4. الإصدار: Release PR من develop إلى main + ترقيم `package.json` وفق SemVer + Tag على commit في main + GitHub Release.
5. قاعدة البيانات الإنتاجية خارج مجلد الإصدار؛ ممنوع `db:push:fresh` و`--accept-data-loss` في الإنتاج؛ نسخة متسقة قبل أي نشر (deploy.sh يفعلها تلقائياً).
6. لا أسرار في المستودع — GitHub Secrets/Environments فقط.
7. `bun run build` في CI فقط؛ بيئة المعاينة المحلية dev فقط.
8. `main_db.sqlite` وأرشيفات الجذر (res.zip وغيرها) مصادر موثقة — لا تُمسّ ولا تُحذف.

## الخطوة التالية المطلوبة

بعد اكتمال إعادة الهيكلة (تأكيد القائمة في التقرير النهائي): الانتقال إلى `docs/audit/PRIORITIZED_BACKLOG.md` — القضايا المفتوحة حالياً: #9 تنزيل التلاوات (P1)، #10 اختبارات E2E (P1)، #11 rate-limit SQLite (P2)، #12 فهرس البحث (P2) — عبر الدورة الجديدة: فرع من develop → PR → CI → دمج.

## أوامر الاستئناف السريعة

```bash
cd /home/z/my-project
git fetch origin --prune --tags
git checkout -B main origin/main            # البيئة تفرض HEAD=main محلياً — أبقِ main متطابقاً دائماً
git branch -f develop origin/develop 2>/dev/null || true
bun install && bunx prisma generate && bun run dev   # الخادم على :3000
bun test                                     # 22+ اختبار أخضر قبل أي تغيير — أي انحراف يعني تراجعاً
# فرع عمل جديد (استخدم git branch -f إذا انقلبت البيئة):
git checkout -b fix/<name> origin/develop
git push origin fix/<name>:fix/<name>        # الدفع بالاسم الصريح دائماً
```

## ملاحظات بيئية حرجة (تجربة مؤكدة 4 مرات)

- **البيئة تعيد HEAD إلى main المحلي دورياً** وتعيد الشجرة لمحتوى main — الحل المطبق: اجعل main المحلي = الحالة المطلوبة (`git checkout -B main origin/main`)، والعمل عبر `git branch -f` والدفع بالاسم الصريح `<local>:<remote>`.
- الدمج البعيدة تُنفَّذ عبر GitHub API (merge commits) — لا دفع مباشر إلى main/develop.
- التوكن GitHub: من المحادثة (حساب wweziz000، صلاحية admin) — يُحفظ في `/home/z/.gh_token` خارج المستودع فقط، ولا يُكتب في أي ملف داخل المستودع، ويُنصح المالك بتجديده بعد الجلسة.
- الملف الجديد في public/ قد يرجع 404 في dev حتى إعادة تشغيل الخادم.
