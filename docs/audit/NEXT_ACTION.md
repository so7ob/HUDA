# الخطوة التالية — نقطة الاستئناف

> حدّث هذا الملف آخر شيء قبل توقف أي جلسة. اقرأه أولًا عند بدء جلسة جديدة.

## الحالة بعد الدورة 5 (Issue #10 — مكتملة ومُصدرة v0.5.0)

| العنصر | القيمة الفعلية |
|---|---|
| `main` (الإنتاج) | `65ac110` — الإصدار v0.5.0 (Tag + GitHub Release: https://github.com/so7ob/HUDA/releases/tag/v0.5.0) |
| `develop` (التكامل) | `7c8353e` = PR #22 مدمج؛ **مزامنة post-release قيد الإنجاز: PR من `chore/sync-develop-v0.5.0` (يُستكمل رقمه بعد الإنشاء)** |
| دورة الميزة | فرع `test/e2e-critical` من develop → **PR #22**: https://github.com/so7ob/HUDA/pull/22 — CI أخضر (quality-gates + e2e-critical-paths) |
| Issue #10 | مغلق بأدلة: 14 اختبار E2E (قراءة/مصحف/آخر قراءة، بحث، مفضلة+استمرارية، إدارة+حدّ محاولات، تلاوة حقيقية بمحاكاة CDN) — تعليق الإغلاق: https://github.com/so7ob/HUDA/issues/10#issuecomment-6841697060 |
| الإصدار | PR #23 → main = `65ac110` + Tag v0.5.0 + GitHub Release (version-check + release-gates ✓) |
| الاختبارات | `bun test` 37/37 وحدة + `playwright test` 14/14 E2E (محليًا مرتين + CI) |
| Staging/Production | كما هي: workflows جاهزة، النشر غير مفعّل (Issue #17 ينتظر خادمًا/أسرارًا) |

## القواعد الحاكمة (غير قابلة للتفاوض)

1. لا كتابة مباشرة في `main` أو `develop` — دائمًا PR + CI أخضر (الحماية مفروضة على GitHub فعليًا).
2. لا force push ولا حذف فروع محمية ولا إعادة كتابة تاريخ.
3. فروع العمل من `origin/develop` المحدّث: `feature/*` `fix/*` `refactor/*` `perf/*` `test/*` `chore/*`؛ `hotfix/*` من `main` ويُعاد دمجه في develop.
4. الإصدار: Release PR من develop إلى main + ترقيم SemVer في `package.json` (يفرضه version-check مقارنةً بـ main) + Tag على main + GitHub Release.
5. **مزامنة develop ← main بعد كل إصدار** (PR chore/sync كما في #18/#21) — منع اختلاف دائم وإبقاء سجلات التدقيق حديثة.
6. قاعدة البيانات الإنتاجية خارج شجرة الإصدار؛ ممنوع `db:push:fresh` و`--accept-data-loss` في الإنتاج.
7. لا أسرار في المستودع — GitHub Secrets/Environments فقط.
8. `bun run build` في CI فقط؛ بيئة المعاينة المحلية dev فقط.
9. `main_db.sqlite` وأرشيفات جذر المستودع (res.zip وأخواتها) مصادر موثقة للقراءة فقط.
10. اختبارات E2E الآن **بوابة إلزامية** (`e2e-critical-paths`) — أي كسر للمسارات الحرجة يمنع الدمج.

## الخطوة التالية المطلوبة (وفق PRIORITIZED_BACKLOG.md)

اختيار واحد من P1 المتبقية (كلاهما بلا اعتماديات):
1. **Q-06** اختبار الاستمرارية الشامل: مفضلة/علامات/آخر قراءة عبر إغلاق وفتح الجلسة (جزء منها مغطى الآن في E2E — يستكمل العلامات المرجعية والخطط)؛ أو
2. **L-3** دورة حياة محتوى المكتبة: مسودة ← مراجعة ← نشر مع قصر الحذف على غير المنشور (API + واجهة الإدارة موجودة جزئيًا — يعتمد على admin panel).

الموصى به: **L-3** (قيمة وظيفية مباشرة في لوحة الإدارة)، ثم **P-1** (استئناف الخطط والإحصاءات).

## أوامر الاستئناف السريعة

```bash
cd /home/z/my-project
git fetch origin --prune --tags
git checkout -B main origin/main            # البيئة تفرض HEAD=main محليًا — أبقِ main متطابقًا
bun install && bunx prisma generate && bun run dev   # الخادم على :3000
bun test                                     # 37 وحدة — أخضر قبل أي تغيير
# E2E عند الحاجة (لا يشغّل خادم المعاينة — خادم مستقل :3105):
# cd /home/z/worktrees/<branch> && bun run test:e2e
# فرع عمل جديد (worktree آمن):
git fetch origin develop && git worktree add -b <type>/<name> /home/z/worktrees/<name> origin/develop
git push origin <type>/<name>:<type>/<name>
```

## ملاحظات بيئية حرجة (تجربة مؤكدة)

- **البيئة تعيد HEAD إلى main المحلي دوريًا** وتعيد الشجرة لمحتوى main — الحل: main المحلي = origin/main دائمًا، والعمل عبر `git worktree` تحت `/home/z/worktrees/`، والدفع بالاسم الصريح `<local>:<remote>`.
- الدمج البعيدة عبر GitHub API (PR merge commits) — الحماية على main/develop تمنع الدفع المباشر حتى للـ admin.
- التوكن GitHub: `/home/z/.gh_token` خارج المستودع فقط — يُنصح المالك بتجديده وإبطال القديم.
- **Playwright جاهز محليًا**: chromium-1200 في `~/.cache/ms-playwright` مع `@playwright/test@1.57.0` — شغّله عبر `./node_modules/.bin/playwright test` (Node 24 متوفر) لا `bunx playwright`.
- عنصر `<audio>` غير ملحق بالـ DOM — الفحص عبر `window.__hudaAudio` (dev فقط)؛ درج vaul يضع `aria-hidden` على الخلفية — أغلقه بـ Escape قبل أي تفاعل لاحق.
