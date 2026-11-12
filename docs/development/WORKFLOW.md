# دورة العمل — WORKFLOW

## الدورة الكاملة الدائمة

```text
Issue
  ↓
Branch from origin/develop (updated)
  ↓
Implement + Tests
  ↓
Quality gates locally (lint / bun test / tsc)
  ↓
Push branch + open PR → develop
  ↓
CI (GitHub Actions: ci.yml)  ← أي فشل يُصلح ويُعاد
  ↓
Merge PR (merge commit) → develop
  ↓
Staging (staging.yml: build artifact + نشر مشروط بالبوابة)
  ↓
Release PR: develop → main (ترقيم SemVer) — فحوص release.yml
  ↓
Merge → Tag vX.Y.Z → GitHub Release
  ↓
Production (production.yml — نشر مشروط + بوابة تاريخ main)
  ↓
Publish result + تحديث سجلات المشروع
```

## Hotfix (إصلاح إنتاجي عاجل)

```text
Bug حرج في إصدار منشور
  ↓
hotfix/* من أحدث main مستقر
  ↓
إصلاح + اختبارات + PR إلى main (فحوص release.yml)
  ↓
دمج + إصدار Patch جديد (SemVer: تصحيح الثالث) + Tag + Release
  ↓
إعادة دمج الإصلاح في develop إجبارياً (منع اختلاف دائم بين main وdevelop)
```

## قواعد ثابتة

- لا يُنشر كل commit تطويري للإنتاج — الإصدار دوري عند جاهزية مجموعة تحسينات.
- Issue يُغلق فقط بعد دمج PR يحلّه بأدلة، ويُشار رقم PR في تعليق الإغلاق.
- عند توقف الجلسة أو بلوغ حدود البيئة: حدّث `docs/audit/NEXT_ACTION.md` فوراً (الحالة الفعلية + SHA + نقطة الاستئناف).
- لا تعد إلى `huda-web-app` فرعاً رئيسياً للتطوير أبداً — تاريخه محفوظ فقط.

## ملاحظات بيئة المعاينة (الساندبوكس)

- البيئة تعيد HEAD إلى main المحلي دورياً — أبقِ `main` المحلي متطابقاً مع `origin/main`، واستخدم `git worktree` أو `git branch -f` للعمل على الفروع.
- الدفع دائماً بالاسم الصريح: `git push origin <local>:<remote>`.
- `bun run build` في CI فقط؛ المحلي dev فقط.
- الدمج البعيدة عبر GitHub API (PR merge) — لا دفع مباشر إلى main/develop.

## سجل العمليات

كل دورة تُوثّق في `docs/audit/IMPLEMENTATION_LOG.md` (ما نُفّذ، الأدلة، روابط PR/CI)، ونتائج الجودة في `QUALITY_REPORT.md`.
