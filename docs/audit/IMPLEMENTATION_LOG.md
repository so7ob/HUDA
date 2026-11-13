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
- مزامنة ما بعد الإصدار: **PR #18** (chore/sync-develop-v0.3.0 من develop، دمج origin/main) — quality-gates ✓ — مدمج → **develop = `1ce6d68`** (الإصدار 0.3.0 على develop)
- CI على PR الترحيل: lint + 22 اختبار + build standalone + tsc — [يُستكمل رقم PR ونتيجة CI بعد التشغيل والدمج]

### الدمج والنتائج الفعلية (الدورة 3 — تكملة)
- **PR #14** (ترحيل + بنية CI/CD): CI أخضر فعلي على GitHub — `release-gates` ✓ (install مجمد + prisma + lint + bun test 22 + build standalone + tsc) و`version-check` ✓ — مدمج بـ merge commit: **main = `1c4a4f7`** (رابط: https://github.com/so7ob/HUDA/pull/14)
- تحقق محتوى main من GitHub API: src/prisma/public/scripts/tests/docs/package.json/bun.lock/.github + الأرشيفات الأربع HTTP 200
- **develop** أُنشئ من main = `1c4a4f7` (تطابق SHA مؤكد عبر API) ثم **PR #15** (وثائق دورة التطوير، فرع `chore/docs-dev-cycle` من develop): CI أخضر — `quality-gates` ✓ — مدمج → **develop = `53ca395`**
- **حماية الفروع مؤكدة** (GET protection): main يطلب [`release-gates`,`version-check`]، develop يطلب [`quality-gates`]، strict up-to-date، enforce_admins، منع force push ومنع الحذف، 0 موافقات (مستودع مطور واحد)
- Release PR: **#16** (رابط: https://github.com/so7ob/HUDA/pull/16) — bump `0.2.1 → 0.3.0` + سجلات نهائية — الإصدار: https://github.com/so7ob/HUDA/releases/tag/v0.3.0
- Staging/Production: workflows جاهزة؛ النشر غير مفعّل بغياب خادم/أسرار — الحالة موثقة بصدق في `production-gate-status` و`staging-build`

---

## الدورة 4 — Issue #9: تنزيل التلاوات فعليًا والتشغيل دون شبكة

**الفرع:** `feature/audio-downloads` (من أحدث origin/develop بعد PR مزامنة #18) — **PR: https://github.com/so7ob/HUDA/pull/19**

### ما نُفّذ فعليًا

| الملف | التغيير |
|---|---|
| `src/lib/audio-store.ts` (جديد) | مخزن الصوت المحلي IndexedDB (`noor-alhuda-audio`/`ayahs`): Blob لكل آية بمفتاح `{reciterId}:{ayahId}`، خرائط الآيات العالمية، بناء الروابط، قراءة blob: للتشغيل، حذف فردي/كلي، تقدير التخزين، ومنسّق تنزيل بconcurrency=4 مع تقدم وإلغاء واستئناف ناقص (منفذ تخزين قابل للحقن للاختبارات) |
| `src/app/api/audio/[ayahId]/route.ts` (جديد) | Proxy داخلي بنفس الأصل لملفات MP3 — **ضروري لأن cdn.islamic.network لا يرسل ترويسات CORS** (مؤكد بالقياس: GET بلا ACAO وOPTIONS=403) — تمرير مباشر بلا تخزين خادمي + `Cache-Control` طويل |
| `src/components/player/audio-engine.tsx` | يقرأ من المخزن المحلي أولًا: الآية المنزّلة تُشغَّل من `blob:` حتى مع وجود الشبكة؛ وإلا قالب المقرئ عبر الشبكة (السلوك السابق محفوظ). إدارة دورة حياة blob URLs (revoke) + منع سباقات تغيّر الحالة + خطاف فحص dev-only `window.__hudaAudio` |
| `src/components/player/player-sheet.tsx` | التنزيل الفعلي مع شريط تقدم (done/total) وزر إلغاء؛ شارة «منزّلة — متاحة دون إنترنت» **بشرط التغطية المحلية الكاملة لا السجل فقط**؛ كشف سجلات الدورة الوهمية القديمة («إكمال تنزيل — ملفات ناقصة»)؛ الحجم المسجل حقيقي (مجموع بايتات الملفات) |
| `src/components/settings/downloads-screen.tsx` | إدارة حقيقية: عدد الملفات المحلية لكل سجل («٧ ملف محليًا · كاملة» / «سجل قديم بلا ملفات»)، الحجم الحقيقي، بطاقة استهلاك تخزين المتصفح (usage/quota)، حذف فردي (سجل + ملفات الآيات)، حذف الكل بتأكيد خطوتين |
| `src/app/api/downloads/delete/route.ts` | دعم `?all=1` (deleteMany) + تفادي 500 عند حذف سجل مفقود |
| `src/lib/api.ts` | `clearDownloads` + **إصلاح خلل سابق**: `removeDownload` كان يستدعي `DELETE /api/downloads` بلا معالج DELETE (405) — صُحّح إلى `/api/downloads/delete?id=` |
| `src/app/globals.css` | **إصلاح خلل مرافق مكتشف بالفحص البصري**: `position: relative` خام داخل `.bg-header-gradient` كان يتغلب على utilities فيلغي `fixed`/`sticky` — زر التلاوة العائم كان خارج الشاشة فعليًا والترويسات اللاصقة لا تلتصق. نُقل الربط إلى `.header-pattern:not(.sticky):not(.fixed)` |
| `tests/unit/audio-store.test.ts` (جديد) | 25 اختبار: مفاتيح/تحليل، خرائط الآيات، روابط القوالب والproxy، منسّق التنزيل (نجاح كامل، فشل جزئي، skipExisting، إلغاء، حد concurrency، قائمة فارغة) عبر تخزين ذاكرة |

### الإثبات (متصفح فعلي — agent-browser على بيئة المعاينة)
- CI الدورة: **quality-gates** أخضر على GitHub (lint + bun test 37 + build standalone + tsc) — [رابط التشغيل يُسجل بعد الدمج]
- **التنزيل الفعلي:** 7 آيات → IndexedDB: 7 Blobs بمفاتيح `ar.alafasy:1..7`، مجموع **796,680 بايت** = السجل الخادمي بالبايت = حجم ملف CDN بالبايت (146,830 للآية الأولى)
- **شرط القبول (دون شبكة):** `set offline on` ثم تشغيل السورة من بدايتها — `navigator.onLine=false`، المصدر `blob:` طوال التشغيل، التقدم آية ١→٧ كاملًا، **صفر طلبات جديدة لـ CDN في سجل الشبكة طوال النافذة**
- المخزن أولًا حتى online: بعد التنزيل يبدأ التشغيل من `blob:` مباشرة؛ بعد الحذف يعود إلى CDN
- إدارة التنزيلات: «٧ ملف محليًا · 0.8 م.ب · كاملة» + بطاقة تخزين المتصفح (0.8 م.ب من الحصة) + حذف الكل بتأكيد → IndexedDB=0 وسجلات=[] وإعادة تنزيل نظيف كامل
- الـ proxy: آية صالحة = MP3 حقيقي 200، آية غير صالحة = 400 عربي، مقرئ افتراضي يعمل

### حدود موثقة بصدق
- قائمة التنزيلات في الشاشة سجل خادمي — دون شبكة تعرض حالة الفراغ (ملفات الـ Blob محلية لكن الإدارة تحتاج الشبكة) — تحسين مستقبلي: تخزين مؤقت للقائمة
- إثبات «دون شبكة» عبر محاكاة offline في المتصفح الآلي — يُستحسن اختبار يدوي على جهاز حقيقي

### الإصدار الفعلي — v0.4.0 (الدورة 4 — تكملة)
- **Release PR #20** (release/v0.4.0 من develop، bump `0.3.0 → 0.4.0`): `release-gates` ✓ + `version-check` ✓ — مدمج بـ merge commit → **main = `55f0bcd`** (https://github.com/so7ob/HUDA/pull/20)
- **GitHub Release + Tag v0.4.0** على main: https://github.com/so7ob/HUDA/releases/tag/v0.4.0 (release.yml يبني artifact عند دفع التاج)
- حالة النشر: **«منشور على main غير منشور-إنتاجياً»** — النشر الإنتاجي غير مفعّل (لا خادم/أسرار — Issue #17) وفق الوثائق
- Issue **#9 مغلق** بتعليق أدلة: https://github.com/so7ob/HUDA/issues/9 (شرط القبول offline مثبت بالمتصفح)
- مزامنة ما بعد الإصدار: هذا الـ PR نفسه (develop ← main)

---

## الدورة 5 — Issue #10: اختبارات E2E آلية للمسارات الحرجة

**الفرع:** `test/e2e-critical` (من أحدث origin/develop بعد PR مزامنة #21) — **PR: https://github.com/so7ob/HUDA/pull/22**

### ما نُفّذ فعليًا

| الملف | الوظيفة |
|---|---|
| `playwright.config.ts` | خادم Next dev مستقل على :3105 عبر `webServer` (انتظار `/api/health`)، workers=1 متسلسل، trace/screenshot عند الفشل، إعادة محاولة في CI فقط |
| `tests/e2e/seed-e2e.ts` (بـ bun) | بناء `db/e2e.db` من نسخة المحتوى المرجعي `db/custom.db` (114 سورة، 6236 آية، 6 مقرئين، كتب) + تصفير بيانات الاستخدام الشخصية + ضبط كلمة مرور المدير بقيمة E2E معلومة (scrypt مطابق لـ `hashPassword`) |
| `tests/e2e/global-setup.ts` | يستدعي البذرة بـ bun قبل إقلاع الخادم في كل تشغيل |
| `tests/e2e/helpers.ts` | محددات user-facing (أدوار/أسماء) + فتح سور عبر ترتيب الفهرس الثابت + اعتراض CDN التلاوة وتغذية WAV مُصنَّع برمجيًا (صفر طلبات خارجية) |
| `tests/e2e/reading.spec.ts` | 4 اختبارات: فهرس 114 سورة، فتح الفاتحة وعرض آياتها، تبديل قائمة↔مصحف، حفظ آخر قراءة واستعادتها بعد إعادة تحميل كاملة |
| `tests/e2e/search.spec.ts` | 3 اختبارات: نتائج مجمعة، حالة «لا توجد نتائج»، فتح نتيجة يفتح القارئ |
| `tests/e2e/favorites.spec.ts` | اختباران: إضافة→استمرارية عبر إعادة تحميل كاملة→إزالة من الدرج؛ إزالة من الشاشة وتحديث العدّاد |
| `tests/e2e/admin-auth.spec.ts` | 3 اختبارات: دخول صحيح وخروج، رفض كلمة مرور خاطئة، قفل حدّ المحاولات (5 فاشلة/15 د) |
| `tests/e2e/recitation.spec.ts` | اختباران: تشغيل السورة والآية المفردة — إثبات صوت فعلي عبر `window.__hudaAudio` (زمن يتقدم) + المشغّل المصغّر |
| `bunfig.toml` | `[test].root = ./tests/unit` — عزل اكتشاف bun test عن مواصفات Playwright |
| `package.json` | سكربتا `test:e2e` و`test:e2e:headed` (Playwright عبر Node — لا bun runtime) |
| `.github/workflows/ci.yml` | job إلزامي جديد `e2e-critical-paths`: chromium `--with-deps` + `bun run test:e2e` + رفع الآثار عند الفشل (7 أيام) |
| `docs/development/e2e-tests.md` | دليل تشغيل + جدول العزل + الدروس المستخلصة الستة |

### الدروس المستخلصة (موثقة لمنع تكرارها)
1. أسماء السور بالرسم العثماني («ٱلْفَاتِحَةِ») — المطابقة النصية العادية تفشل؛ اعتماد ترتيب الفهرس الثابت وبنية الأدوار.
2. درج vaul يبقى مفتوحًا بعد الإضافة ويضع `aria-hidden` على كل ما خلفه — يجب Escape قبل «رجوع».
3. الزر العائم للتلاوة يختفي عند ظهور المشغّل المصغّر (`player.visible`).
4. نقرات Playwright حقيقية تمنح إذن autoplay.
5. `DATABASE_URL=file:../db/e2e.db` يُحل نسبةً إلى `prisma/` — الملف الفعلي `db/e2e.db` بجذر المشروع.
6. Playwright 1.57 (chromium 1200) يعمل عبر Node محليًا — `bunx playwright` قد يستدعي bun runtime.

### الإثبات
- **محليًا:** `playwright test` — **14/14 أخضر مرتين متتاليتين** (حتمية، ~1.3 د لكل تشغيل) + `bun test` 37/37 + `tsc --noEmit` نظيف + `eslint` نظيف
- **CI على PR #22 إلى develop:** `quality-gates` ✓ **و`e2e-critical-paths` ✓** (أول تشغيل E2E أخضر على GitHub Actions: https://github.com/so7ob/HUDA/pull/22)
- **الإصدار:** Release PR **#23** (SemVer 0.4.0→0.5.0) — `version-check` ✓ + `release-gates` ✓ — مدمج → **main = `65ac110`** — Tag + GitHub Release: https://github.com/so7ob/HUDA/releases/tag/v0.5.0
- **Issue #10** أُغلق بتعليق أدلة: https://github.com/so7ob/HUDA/issues/10#issuecomment-6841697060

### مزامنة ما بعد الإصدار (هذه الدورة)
- **PR المزامنة:** `chore/sync-develop-v0.5.0` من main → develop (بما فيها سجلات الدورة 5 هذه) — يُستكمل رقم PR والنتيجة بعد الدمج
