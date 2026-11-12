# النشر الإنتاجي — PRODUCTION

## السياسة الحاكمة

1. الإنتاج يُنشر **من main فقط**، ومن **Tags** تشير إلى commits في تاريخ main (يفرض production.yml هذا الحاجز فعلياً عبر `git merge-base --is-ancestor`).
2. بوابة مزدوجة: متغير `PRODUCTION_DEPLOY_ENABLED=true` + GitHub Environment باسم `production` (مع مراجعين عند توفر المالكين).
3. قاعدة البيانات خارج شجرة الإصدار؛ نسخة متسقة قبل كل نشر؛ **لا** `--accept-data-loss` إطلاقاً.
4. لا أسرار في المستودع — كل شيء عبر GitHub Secrets داخل environment الإنتاج.

## التدفق المعتمد

```text
Release Ready
  ↓
Release PR (develop → main) + فحوص release.yml
  ↓
Merge إلى main
  ↓
Tag vX.Y.Z على commit في main + GitHub Release
  ↓
production.yml (release published / workflow_dispatch مع tag)
  ↓
Build Artifact (بناء جديد من الـ tag نفسه)
  ↓
Deployment Approval (environment production)
  ↓
Deploy via deploy.sh: DB backup → release dir → symlink → restart
  ↓
Health Check (/api/health) + فحص دخان
  ↓
نجاح: نتيجة منشورة | فشل: Rollback تلقائي + إصدار يعتبر غير منشور ناجحاً
```

## متطلبات التفعيل (عند توفر خادم)

- أسرار: `PRODUCTION_HOST`, `PRODUCTION_SSH_KEY`, `PRODUCTION_DEPLOY_PATH`.
- متغيرات: `PRODUCTION_DEPLOY_ENABLED=true` (+ اختياري `PRODUCTION_SERVICE`, `PRODUCTION_HEALTH_URL`).
- Environment `production` مع مراجعين إلزاميين.
- خادم محضّر وفق [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) (systemd + Nginx + HTTPS + مستخدم huda).

## تغييرات المخطط (Schema) في الإنتاج

1. أوقف النشر التلقائي إن كان التغيير حساساً (أغلق البوابة مؤقتاً).
2. نسخة متسقة يدوية: `sqlite3 data/app.db ".backup 'data/backups/pre-migration.db'"`.
3. من checkout للـ tag المعني على الخادم:
   `DATABASE_URL=file:/opt/huda/production/data/app.db bunx prisma db push --skip-generate`
4. أعد النشر وأجرِ فحوص دخان كاملة.
5. عند أي مشكلة: [`ROLLBACK.md`](ROLLBACK.md).

## ما بعد النشر (إجباري)

```bash
curl -s https://<domain>/api/health        # status ok + database up
curl -o /dev/null -w '%{http_code}' https://<domain>/          # 200
# فحص دخان وظيفي: فتح المصحف صفحة 1، قارئ الفاتحة، بحث، لوحة الإدارة (دخول آمن)
```

ثم سجّل: رقم الإصدار، الـ SHA، نتيجة الفحوص، والوقت — في `docs/audit/IMPLEMENTATION_LOG.md`.

> **حالة التنفيذ الحالية:** آلية النشر كاملة الملفات ومحكومة بالبوابة؛ النشر الفعلي غير مفعّل لغياب خادم/نطاق/أسرار موثقة — لا يُدّعى نشر لم يحدث.
