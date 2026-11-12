# عملية الإصدار — RELEASE_PROCESS

## متى نصدر؟

لا ننشر كل commit تطويري. يصدر إصدار عند تحقق واحد من:
- اكتمال مجموعة تحسينات جاهزة (Issues مغلقة بأدلة في develop).
- إنهاء مرحلة تطوير كاملة.
- وجود إصلاح إنتاجي حرج (Hotfix — إصدار فوري).

## ترقيم الإصدارات (Semantic Versioning)

`vMAJOR.MINOR.PATCH` — الانطلاقة من `package.json` (الحالي: `0.2.1`):

| التغيير | الرقم الجديد |
|---|---|
| ميزات جديدة متوافقة (مثل: تنزيل التلاوات #9) | `v0.3.0` |
| إصلاحات فقط | `v0.2.2` |
| كسر توافق (نادر — تغيير API/بيانات) | `v1.0.0` |

- الرقم يُحدَّث في `package.json` داخل **Release PR** — وrelease.yml يفرض الفرق عن main فعلياً (version-check).
- Tag يشير إلى commit في main (يُنشأ عند الدمج تلقائياً عبر target_commitish).

## خطوات الإصدار القياسية

1. **راجع** ما في develop منذ آخر إصدار: `git log --oneline origin/main..origin/develop` — تأكد لا أخطاء حرجة مانعة.
2. **أنشئ فرع** `release/vX.Y.Z` من `origin/develop` (اختياري لتحضير نصوص) أو افتح Release PR مباشرة من develop إلى main.
3. **حدّث** `package.json` (الإصدار الجديد) + ملخص التغييرات في وصف الـ PR + تحديث `docs/audit/`.
4. انتظر **release.yml** أخضر (release-gates + version-check).
5. **ادمج** (merge commit).
6. **أنشئ GitHub Release** بعنوان `vX.Y.Z` و target = main وRelease Notes مرتبة (ميزات/إصلاحات/ترقيات/أدلة):
   - يولّد التاج تلقائياً على رأس main.
   - `release.yml` يبني artifact الإصدار تلقائياً عند دفع التاج.
7. **النشر** إذا كانت بيئة الإنتاج مفعّلة ([`PRODUCTION.md`](PRODUCTION.md)) — وإلا سجّل "منشور غير منشور-إنتاجياً".
8. **سجّل النتيجة الفعلية** (روابط Tag/Release/Workflow) في `docs/audit/IMPLEMENTATION_LOG.md`.

## Hotfix خاص

انظر [`../development/WORKFLOW.md`](../development/WORKFLOW.md) §Hotfix — من main، إصدار Patch، وإعادة دمج في develop **إجبارية**.

## قائمة تحقق قبل إعلان الإصدار

- [ ] CI أخضر على Release PR (release-gates + version-check)
- [ ] لا Issues مفتوحة بلافتتاحية حرجة غير موثقة
- [ ] `bun test` أخضر + build standalone ناجح (تلقائي في CI)
- [ ] ترقيم SemVer صحيح ومسجل في package.json
- [ ] Release Notes كاملة بأدلة
- [ ] نتيجة النشر الإنتاجي موثقة (أو حالة "غير مفعّل" موثقة)

## نموذج Release Notes

```markdown
## ما الجديد
- ...

## الإصلاحات
- ...

## تحسينات البنية
- ...

## الأدلة
- CI: <رابط التشغيل>
- الفحوص: bun test <N/N>، build ✓، فحص دخان <نتيجة>

## التثبيت/التحديث
- إنتاج: انظر docs/deployment/PRODUCTION.md
```
