# سجل التنفيذ الفعلي — نور الهدى

> يُحدَّث بعد كل دورة: ما تغيّر فعليًا، أين، وبأي دليل.

## الدورة 1 — الفرع dev/audit-p0 (من huda-web-app 02a98c0)

### الملفات المعدلة
| الملف | التغيير |
|---|---|
| `next.config.ts` | إزالة ignoreBuildErrors + reactStrictMode:true |
| `src/app/api/admin/chapters/[id]/route.ts` | **P0 إصلاح انهيار**: إضافة استيراد requireAdmin/unauthorized + تمرير actor للتدقيق |
| `src/lib/rate-limit.ts` | **جديد**: حدّ محاولات بخط مزلق + قفل زمني |
| `src/app/api/admin/auth/login/route.ts` | تطبيق الحدّ (5/15د → قفل 120ث) + إرجاع mustChangePassword |
| `src/lib/admin-auth.ts` | كوكي آمن في الإنتاج (COOKIE_SECURE=0 للاستثناء) + isDefaultPassword |
| `src/app/api/admin/auth/session/route.ts` | إرجاع defaultPassword للوحة |
| `src/components/settings/admin-panel.tsx` | banner إلزام تغيير كلمة المرور الافتراضية (role=alert) |
| `src/lib/api.ts` | نوع AdminTopicDetail دقيق (إصلاح أخطاء TS) + حقول الجلسة |
| `src/lib/arabic.ts` | **P0 بحث**: U+0670→ا في التطبيع + alefFlexible/arabicMatch |
| `src/app/api/search/route.ts` | تطبيق arabicMatch على كل فئات البحث السبع |
| `tests/unit/arabic.test.ts` | **جديد**: 14 اختبار تطبيع/مطابقة |
| `tests/unit/security.test.ts` | **جديد**: 8 اختبارات scrypt + rate-limit |
| `package.json` | typecheck/test scripts + db:push آمن + db:push:fresh صريح |
| `tsconfig.json` | استثناء infra فقط (examples/skills/scripts/mini-services) |
| `docs/audit/*` | السجلات السبعة |

### الاختبارات والنتائج
- `bun test`: 22 ناجحة / 0 فاشلة
- `tsc --noEmit`: EXIT 0 (كان يخفي 4 أخطاء)
- `bun run lint`: نظيف
- E2E حي: rate-limit (4×401→429+Retry-After)، دخول+mustChangePassword، session defaultPassword، حراسة 401، PATCH فصل 200 (كان 500) + استرجاع، بحث لا إله إلا الله (15 نتيجة)، عالمين (60 آية)، انحدار واجهة سليم

### المكتشف الجديد أثناء الدورة (سُجل لا أُهمل)
- تعارض الألف الخنجرية: إِلَٰهٌ≠اله و عَـٰلَمِينَ≠عالمين — حُلّ بمطابقة مرنة ثانية (موثق في الشيفرة والاختبارات)
- حذف db/custom.db التشغيلي عند إنشاء الفرع: بيانات معاينة فقط، بلا فقدان مصادر — موثق هنا للشفافية

### المتبقي من الدورة
- لا شيء — منشور ودمج عبر PR#1 إلى huda-web-app


## الدورة 2 — الفرع dev/offline-pwa (Issue #8)

### الملفات
| الملف | التغيير |
|---|---|
| `public/sw.js` | جديد — 4 استراتيجيات كاش + استثناءات أمنية + قصّ 120 صفحة |
| `src/components/shared/sw-register.tsx` | جديد — تسجيل شرطي |
| `src/app/layout.tsx` | إدراج ServiceWorkerRegister |

### الإثبات
- E2E متصفح حي: SW-ACTIVE → تصفح تمهيدي → offline on + reload → الرئيسية بفهرسها تعمل، المصحف صفحة 1 يرسم كاملًا، صفر شاشة خطأ
- استعادة الشبكة: 7 آيات — لا انحدار
- bun test 22/22، tsc EXIT 0، lint نظيف

### الدمج
- PR #13 مدمج في huda-web-app (9b8854d) — القضية #8 أُغلقت بالأدلة


## الدورة 2 — الفرع dev/offline-pwa (Issue #8)

### الملفات
| الملف | التغيير |
|---|---|
| `public/sw.js` | جديد — 4 استراتيجيات كاش + استثناءات أمنية + قصّ 120 صفحة |
| `src/components/shared/sw-register.tsx` | جديد — تسجيل شرطي |
| `src/app/layout.tsx` | إدراج ServiceWorkerRegister |

### الإثبات
- E2E متصفح حي: SW-ACTIVE → تصفح تمهيدي → offline on + reload → الرئيسية بفهرسها تعمل، المصحف صفحة 1 يرسم كاملًا، صفر شاشة خطأ
- استعادة الشبكة: 7 آيات — لا انحدار
- bun test 22/22، tsc EXIT 0، lint نظيف

### الدمج
- PR #13 مدمج في huda-web-app (9b8854d) — القضية #8 أُغلقت بالأدلة

## الدورة 3 — إعادة هيكلة المستودع: ترحيل huda-web-app إلى main + دورة تطوير وإصدار

### الحالة المؤكدة من origin قبل أي تغيير (أوامر fetch/merge-base/ls-remote)
- `main` القديم = `72af83b` (5 ملفات مرجعية: README، assets.zip، main_db@2.zip، mushaf_.zip، res.zip)
- `huda-web-app` = `dd1dca0` (التطبيق الحديث كامل) — و`dev/audit-p0` و`dev/offline-pwa` **مدمجتان فيه بالكامل** (تحقق `git merge-base --is-ancestor`)
- `save` = `main` القديم تماماً (نفس SHA: 72af83b) — لا عمل غير مدمج
- **لا سلف مشترك** بين main وhuda-web-app (فشل merge-base → تواريخ غير مرتبطة)
- لا PRs مفتوحة، Actions مفعّلة، لا Tags، التوكن بصلاحية admin

### النسخ الاحتياطي (قبل الترحيل)
- `archive/main-before-migration` = `72af83b` — دُفع وتحقق عبر GitHub API
- `archive/huda-before-migration` = `dd1dca0` — دُفع وتحقق عبر GitHub API

### الترحيل الاستثنائي (unrelated histories)
- فرع `integration/bootstrap-main` من `origin/main` ثم دمج `origin/huda-web-app` بـ `--allow-unrelated-histories`
- تعارض وحيد README.md (add/add): **README الحديث أساس** + أرشفة القديم في `docs/legacy/README-old-main.md`
- **commit الدمج: `292794c`** (الأبوين: `72af83b` + `dd1dca0`) — بدون force push، تاريخ الطرفين محفوظ كاملاً
- الأرشيفات المرجعية الأربعة بقيت في مساراتها الأصلية (فحص اعتماديات: docs تشير إليها بالاسم فقط كمصدر)

### إضافات بنية التشغيل (نفس فرع الترحيل)
| الملف | الوظيفة |
|---|---|
| `.github/workflows/ci.yml` | بوابات جودة: install مجمد + prisma + lint + bun test + build + tsc على PRs→develop والدفع إلى develop/main |
| `.github/workflows/staging.yml` | بناء artifact قابل للنشر عند الدفع إلى develop + نشر مشروط بمتغير `STAGING_DEPLOY_ENABLED` |
| `.github/workflows/release.yml` | بوابات إصدار + فحص ترقيم SemVer على PRs→main + artifact عند Tag v* |
| `.github/workflows/production.yml` | نشر إنتاجي مشروط بمتغير `PRODUCTION_DEPLOY_ENABLED` + بوابة أن الـ Tag من تاريخ main |
| `scripts/deploy/deploy.sh` | نشر SSH: مجلد إصدارات + تبديل symlink ذري + نسخة SQLite متسقة قبل النشر + فحص صحة + rollback تلقائي |
| `scripts/deploy/huda-web.service` | قالب systemd (huda@staging / huda@production)، قاعدة البيانات خارج شجرة الإصدار |
| `scripts/deploy/nginx-huda.conf` | قالب reverse proxy + HTTPS (Let's Encrypt) |
| `src/app/api/health/route.ts` | نقطة فحص صحة للنشر الآلي (`/api/health`) |

### ملاحظة CI جوهرية
`next-env.d.ts` في وضع dev يستورد `.next/dev/types/routes.d.ts` — لذلك يبقى مستثنى من git، وترتيب CI: **build أولاً** (يُجري فحص TS الكامل بعد إزالة ignoreBuildErrors ويولّد الأنواع) ثم `tsc --noEmit` للتحقق المزدوج.

### الإثبات
- CI على PR الترحيل: lint + 22 اختبار + build standalone + tsc — [يُستكمل رقم PR ونتيجة CI بعد التشغيل والدمج]

### الدمج والنتائج الفعلية (الدورة 3 — تكملة)
- **PR #14** (ترحيل + بنية CI/CD): CI أخضر فعلي على GitHub — `release-gates` ✓ (install مجمد + prisma + lint + bun test 22 + build standalone + tsc) و`version-check` ✓ — مدمج بـ merge commit: **main = `1c4a4f7`** (رابط: https://github.com/so7ob/HUDA/pull/14)
- تحقق محتوى main من GitHub API: src/prisma/public/scripts/tests/docs/package.json/bun.lock/.github + الأرشيفات الأربع HTTP 200
- **develop** أُنشئ من main = `1c4a4f7` (تطابق SHA مؤكد عبر API) ثم **PR #15** (وثائق دورة التطوير، فرع `chore/docs-dev-cycle` من develop): CI أخضر — `quality-gates` ✓ — مدمج → **develop = `53ca395`**
- **حماية الفروع مؤكدة** (GET protection): main يطلب [`release-gates`,`version-check`]، develop يطلب [`quality-gates`]، strict up-to-date، enforce_admins، منع force push ومنع الحذف، 0 موافقات (مستودع مطور واحد)
- Release PR: <PR_NUM> — bump `0.2.1 → 0.3.0` + سجلات نهائية — الإصدار: <RELEASE_URL>
- Staging/Production: workflows جاهزة؛ النشر غير مفعّل بغياب خادم/أسرار — الحالة موثقة بصدق في `production-gate-status` و`staging-build`
