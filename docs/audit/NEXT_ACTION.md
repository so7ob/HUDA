# الخطوة التالية — نقطة الاستئناف

> حدّث هذا الملف آخر شيء قبل توقف أي جلسة. اقرأه أولًا عند بدء جلسة جديدة.

## الحالة النهائية لإعادة الهيكلة (الدورة 3 — مكتملة بأدلة)

| العنصر | القيمة الفعلية |
|---|---|
| `main` (الإنتاج) | `1c4a4f7` + دمج Release PR — **#16** (رابط: https://github.com/so7ob/HUDA/pull/16) — https://github.com/so7ob/HUDA/commits/main |
| PR الترحيل | **#14** مدمج: `integration/bootstrap-main` → `main` — https://github.com/so7ob/HUDA/pull/14 (CI: release-gates ✓ version-check ✓) |
| commit الترحيل | `292794c` (الأبوين `72af83b` القديم + `dd1dca0` التطبيق) — تاريخ الطرفين محفوظ بلا force push |
| `develop` (التكامل) | أُنشئ من main = `1c4a4f7` (تطابق تام عند التأسيس، تحقق API) → الآن `53ca395` بعد PR **#15** |
| PR اختبار الدورة | **#15** مدمج: `chore/docs-dev-cycle` → `develop` (فرع من develop + CI أخضر + دمج) — https://github.com/so7ob/HUDA/pull/15 |
| أرشيف main القديم | `archive/main-before-migration` = `72af83b` — https://github.com/so7ob/HUDA/tree/archive/main-before-migration |
| أرشيف التطبيق قبل الترحيل | `archive/huda-before-migration` = `dd1dca0` — https://github.com/so7ob/HUDA/tree/archive/huda-before-migration |
| الإصدار الحالي | `v0.3.0` (من `0.2.1`) — Tag على main + GitHub Release: https://github.com/so7ob/HUDA/releases/tag/v0.3.0 |
| CI الفعلي | PR#14: release-gates ✓ version-check ✓ — PR#15: quality-gates ✓ (بناء standalone كامل على GitHub) |
| حماية الفروع | main: [`release-gates`,`version-check`] + strict + enforce_admins + منع force push/حذف + 0 موافقات؛ develop: [`quality-gates`] بنفس القواعد — مؤكدة عبر GET /branches/*/protection |
| Staging | workflow `staging.yml` جاهز (بناء artifact عند كل دفع develop) — النشر **غير مفعّل**: بلا خادم/أسرار (`STAGING_DEPLOY_ENABLED` غير مضبوط) |
| Production | workflow `production.yml` جاهز بحاجزين (`PRODUCTION_DEPLOY_ENABLED` + environment) وحاجز تاريخ main للـ tag — النشر **غير مفعّل** لنفس السبب |
| الفروع الموقوفة | `huda-web-app` لم يعد فرع تطوير (تاريخه محفوظ)؛ `dev/audit-p0`,`dev/offline-pwa`,`save` مغطاة بالأرشيفات |

## القواعد الحاكمة (غير قابلة للتفاوض)

1. لا كتابة مباشرة في `main` أو `develop` — دائماً PR + CI أخضر (الحماية مفروضة على GitHub فعلياً).
2. لا force push ولا حذف فروع محمية ولا إعادة كتابة تاريخ.
3. فروع العمل من `origin/develop` المحدّث: `feature/*` `fix/*` `refactor/*` `perf/*` `test/*` `chore/*`؛ `hotfix/*` من `main` ويُعاد دمجه في develop.
4. الإصدار: Release PR من develop إلى main + ترقيم SemVer في `package.json` (يفرضه version-check) + Tag على main + GitHub Release.
5. قاعدة البيانات الإنتاجية خارج شجرة الإصدار (`/opt/huda/<instance>/data/app.db`)؛ ممنوع `db:push:fresh` و`--accept-data-loss` في الإنتاج؛ نسخة متسقة قبل كل نشر (تلقائية في `deploy.sh`).
6. لا أسرار في المستودع — GitHub Secrets/Environments فقط (قائمة المطلوب: `docs/deployment/DEPLOYMENT_GUIDE.md`).
7. `bun run build` في CI فقط؛ بيئة المعاينة المحلية dev فقط.
8. `main_db.sqlite` وأرشيفات جذر المستودع (res.zip وأخواتها) مصادر موثقة للقراءة فقط.

## الخطوة التالية المطلوبة (الدورة 4 — وفق PRIORITIZED_BACKLOG.md)

1. **Issue #9 (P1)**: تنزيل التلاوات فعلياً — فرع `feature/audio-downloads` من أحدث develop → تنفيذ → اختبارات → PR → دمج.
2. بعدها **Issue #10 (P1)**: اختبارات E2E آلية (Playwright) للمسارات الحرجة — `test/e2e-critical`.
3. عند توفر خادم/نطاق: تفعيل النشر وفق `docs/deployment/` (الأسرار مذكورة في الدليل) وإغلاق issue التفعيل.

## أوامر الاستئناف السريعة

```bash
cd /home/z/my-project
git fetch origin --prune --tags
git checkout -B main origin/main            # البيئة تفرض HEAD=main محلياً — أبقِ main متطابقاً
git branch -f develop origin/develop 2>/dev/null || true
bun install && bunx prisma generate && bun run dev   # الخادم على :3000
bun test                                     # أخضر كامل قبل أي تغيير — أي انحراف يعني تراجعاً
# فرع عمل جديد (worktree آمن مع بيئة المعاينة):
git fetch origin develop && git worktree add -b feature/<name> /home/z/worktrees/<name> origin/develop
git push origin feature/<name>:feature/<name>
```

## ملاحظات بيئية حرجة (تجربة مؤكدة 5 مرات)

- **البيئة تعيد HEAD إلى main المحلي دورياً** وتعيد الشجرة لمحتوى main — الحل المطبق: main المحلي = origin/main دائماً، والعمل على الفروع عبر `git worktree` تحت `/home/z/worktrees/`، والدفع بالاسم الصريح `<local>:<remote>`.
- الدمج البعيدة عبر GitHub API (PR merge commits) — الحماية على main/develop تمنع الدفع المباشر حتى للـ admin.
- التوكن GitHub: `/home/z/.gh_token` خارج المستودع فقط — **يُنصح المالك بتجديده وإبطال القديم** بعد الجلسة.
- الملف الجديد في public/ قد يرجع 404 في dev حتى إعادة تشغيل الخادم.
