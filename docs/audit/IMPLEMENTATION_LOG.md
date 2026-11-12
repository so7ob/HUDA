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
