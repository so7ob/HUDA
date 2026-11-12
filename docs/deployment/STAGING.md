# بيئة التجريب — STAGING

## الغرض

بيئة معزولة تماماً عن الإنتاج لتشغيل ما يُدمج في `develop` قبل الإصدار: فحوص دخان، اتصال قاعدة بيانات مستقلة، تجربة صفحات وAPIs.

## العزل

| العنصر | Staging | Production |
|---|---|---|
| الفرع | `develop` | `main` (Tags فقط) |
| المجلد | `/opt/huda/staging` | `/opt/huda/production` |
| قاعدة البيانات | `/opt/huda/staging/data/app.db` | `/opt/huda/production/data/app.db` |
| المنفذ | 3001 | 3000 |
| الخدمة | `huda@staging` | `huda@production` |

**قاعدة البيانات منفصلة تماماً** — لا مشاركة ملفات، لا نسخ تلقائي من الإنتاج إلا بقرار يدوي موثق.

## سلوك Workflow

`staging.yml` عند كل دفع إلى `develop`:

1. `staging-build`: تثبيت مجمد + prisma + بناء standalone + تعبئة artifact قابل للنشر (يُرفع كـ artifact يحمل SHA) — **يعمل دائماً** ودليله إثبات قابلية الحزم.
2. `staging-deploy`: يعمل **فقط** عند `vars.STAGING_DEPLOY_ENABLED == 'true'`، داخل environment باسم `staging`، ويفحص الأسرار الثلاثة صراحة ثم ينفذ `scripts/deploy/deploy.sh` (نسخة DB → تبديل → فحص صحة → rollback تلقائي).

## التفعيل (عند توفر خادم)

1. أضف الأسرار: `STAGING_HOST`, `STAGING_SSH_KEY`, `STAGING_DEPLOY_PATH`.
2. أضف متغير المستودع: `STAGING_DEPLOY_ENABLED=true` (واختيارياً `STAGING_SERVICE`، `STAGING_HEALTH_URL`).
3. أنشئ GitHub Environment باسم `staging` (اختياري: مراجعون).
4. جرّب: push صغير إلى develop أو `workflow_dispatch` يدوي.

## التحقق بعد كل نشر

```bash
curl -s https://<staging-domain>/api/health     # {"status":"ok","database":"up"}
curl -o /dev/null -w '%{http_code}' https://<staging-domain>/   # 200
```

## تسجيل النتائج

كل نشر تجريبي يُسجَّل في `docs/audit/IMPLEMENTATION_LOG.md`: رقم التشغيل (run)، SHA، نتيجة فحص الصحة والدخان، ورقم الإصدار المبني.

> **حالة التنفيذ الحالية:** الملفات والworkflow جاهزة ومختبرة بنيوياً؛ النشر الفعلي **غير مفعّل** لغياب خادم/أسرار — لن يُدّعى نجاح نشر لم يحدث، والـ workflow يعمل بوضع "بناء فقط + إبلاغ صريح بالبوابة المغلقة".
