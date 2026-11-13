# الخطوة التالية — نقطة الاستئناف

> حدّث هذا الملف آخر شيء قبل توقف أي جلسة. اقرأه أولًا عند بدء جلسة جديدة.

## الحالة بعد الدورة 4 (Issue #9 — مكتملة بأدلة، بانتظار الدمج)

| العنصر | القيمة الفعلية |
|---|---|
| `main` (الإنتاج) | `55f0bcd` — **الإصدار v0.4.0** (Tag + GitHub Release: https://github.com/so7ob/HUDA/releases/tag/v0.4.0) |
| `develop` (التكامل) | متزامن مع main بعد PR مزامنة v0.4.0 (الإصدار 0.4.0 على الطرفين) |
| دورة الميزة | **PR #19** مدمج في develop (`c15676d`): https://github.com/so7ob/HUDA/pull/19 — CI quality-gates ✓ |
| Release PR | **PR #20** مدمج في main (`55f0bcd`): https://github.com/so7ob/HUDA/pull/20 — release-gates ✓ version-check ✓ |
| Issue #9 | **مغلق (completed)** بأدلة: https://github.com/so7ob/HUDA/issues/9 — التخزين الفعلي + التشغيل دون شبكة مثبتان |
| إصلاحات مرافقة | removeDownload كان 405 (مسار DELETE خاطئ)؛ position خام يكسر fixed/sticky (زر التلاوة العائم خارج الشاشة) |
| الاختبارات | bun test: 37/37 أخضر محليًا (25 جديد لمخزن الصوت) |
| Staging/Production | كما هي: workflows جاهزة، النشر غير مفعّل (Issue #17 ينتظر خادمًا/أسرارًا) |

## القواعد الحاكمة (غير قابلة للتفاوض)

1. لا كتابة مباشرة في `main` أو `develop` — دائمًا PR + CI أخضر (الحماية مفروضة على GitHub فعليًا).
2. لا force push ولا حذف فروع محمية ولا إعادة كتابة تاريخ.
3. فروع العمل من `origin/develop` المحدّث: `feature/*` `fix/*` `refactor/*` `perf/*` `test/*` `chore/*`؛ `hotfix/*` من `main` ويُعاد دمجه في develop.
4. الإصدار: Release PR من develop إلى main + ترقيم SemVer في `package.json` (يفرضه version-check مقارنةً بـ main) + Tag على main + GitHub Release.
5. **مزامنة develop ← main بعد كل إصدار** (PR chore/sync كما في #18) — منع اختلاف دائم وإبقاء سجلات التدقيق حديثة في فروع العمل.
6. قاعدة البيانات الإنتاجية خارج شجرة الإصدار؛ ممنوع `db:push:fresh` و`--accept-data-loss` في الإنتاج.
7. لا أسرار في المستودع — GitHub Secrets/Environments فقط.
8. `bun run build` في CI فقط؛ بيئة المعاينة المحلية dev فقط.
9. `main_db.sqlite` وأرشيفات جذر المستودع (res.zip وأخواتها) مصادر موثقة للقراءة فقط.

## الخطوة التالية المطلوبة (الدورة 5 — وفق PRIORITIZED_BACKLOG.md)

1. **Issue #10 (P1)**: اختبارات E2E آلية (Playwright) للمسارات الحرجة — فرع `test/e2e-critical` من أحدث develop.
2. بعدها وفق الأولويات: Issue #11 (ترحيل حد المحاولات إلى SQLite) وIssue #12 (فهرس بحث دائم).
3. عند توفر خادم/نطاق: تفعيل النشر وفق `docs/deployment/` وإغلاق Issue #17.
4. تحسين اختياري موثق: تخزين مؤقت لقائمة التنزيلات لتعمل دون شبكة (دورة قادمة).

## أوامر الاستئناف السريعة

```bash
cd /home/z/my-project
git fetch origin --prune --tags
git checkout -B main origin/main            # البيئة تفرض HEAD=main محليًا — أبقِ main متطابقًا
git branch -f develop origin/develop 2>/dev/null || true
bun install && bunx prisma generate && bun run dev   # الخادم على :3000
bun test                                     # أخضر كامل قبل أي تغيير
# فرع عمل جديد (worktree آمن):
git fetch origin develop && git worktree add -b feature/<name> /home/z/worktrees/<name> origin/develop
git push origin feature/<name>:feature/<name>
```

## ملاحظات بيئية حرجة (تجربة مؤكدة)

- **البيئة تعيد HEAD إلى main المحلي دوريًا** وتعيد الشجرة لمحتوى main — الحل: main المحلي = origin/main دائمًا، والعمل عبر `git worktree` تحت `/home/z/worktrees/`، والدفع بالاسم الصريح `<local>:<remote>`.
- الدمج البعيدة عبر GitHub API (PR merge commits) — الحماية على main/develop تمنع الدفع المباشر حتى للـ admin.
- التوكن GitHub: `/home/z/.gh_token` خارج المستودع فقط — يُنصح المالك بتجديده وإبطال القديم.
- نقرات `eval` البرمجية لا تمنح ترخيص autoplay في المتصفح — استخدم نقرات agent-browser الحقيقية لفحص الصوت.
- عنصر `<audio>` غير ملحق بالـ DOM — الفحص عبر `window.__hudaAudio` (dev فقط) أو نص المشغل المصغّر؛ انتبه: بطاقة «آخر قراءة» تحتوي نصًا مشابهًا — حدد زر المشغل بـ `closest('div.fixed')`.
- عامل أخضر معروف: أنماط `lastIndexOf` في parseAyahKey تدعم معرفات مقرئين تحوي «:».
