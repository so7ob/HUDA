# مكتبة رموز وأشكال «هدى الله» — المصدر والاستخدام

**المصدر:** `res.zip` من المستودع المفتوح <https://github.com/so7ob/HUDA>
(مجلد `res` الخاص بتطبيق أندرويد — 331 ملفًا: 203 صورة PNG + 128 تخطيطًا مُصرَّفًا).

## المحتويات المستخدمة فعليًا في الواجهة

| الأصل | المصدر الأصلي | موضع الاستخدام |
|---|---|---|
| `/huda/logo.png` | `8O.png` (432×432) | أيقونة التطبيق، favicon، شاشة «حول»، ترويسة الرئيسية |
| `/huda/icons/*` | مشتقة من `8O.png` | PWA manifest + favicon (32→512) |
| `/huda/pattern-dark.png` | `pu.png` (860×860) | نقش خلفية الترويسة وشاشة «حول» |
| `/huda/player/play.png` | `zk.png` | زر التشغيل (المشغل المصغر واللوحة) |
| `/huda/player/pause.png` | `YB.png` | زر الإيقاف المؤقت |
| `/huda/player/prev.png` | `1u.png` | الآية السابقة |
| `/huda/player/next.png` | `HA.png` | الآية التالية |
| `/huda/player/rewind.png` | `ma.png` | إعادة سريعة للخلف (مكتبة الرموز) |
| `/huda/player/forward.png` | `Qg.png` | تقديم سريع (مكتبة الرموز) |
| `/huda/player/stop.png` | `FW.png` | زر الإيقاف وإغلاق المشغل |
| `/huda/shapes/droplet*.png` | `g-.png`, `5U.png`, `jW.png`, `EP.png` | فاصل القُطرة — شعار «ورد» القرآني وحالات الفراغ |
| `/huda/shapes/check.png` | `tG.png` | علامة تحديد المقرئ الافتراضي |
| `/huda/shapes/check-small.png` | `dY.png` | علامة تحديد مصغّرة |
| `/huda/shapes/arrow-open.png` | `kp.png` | فتح رابط خارجي (حول التطبيق) |
| `/huda/shapes/phone.png` | `MD.png` | قسم التواصل في «حول التطبيق» |
| `/huda/shapes/video.png` | `OX1.png` | رمز الفيديو التعريفي |
| `/huda/shapes/circle-ring.png` | `j4.png` | حلقة دائرية (مكتبة الرموز) |
| `/huda/shapes/circle-dot.png` | `ly.png` | نقطة دائرية (مكتبة الرموز) |
| `/huda/shapes/square-ring.png` | `pk.png` | مربع بحواف دائرية (مكتبة الرموز) |
| `/huda/shapes/record.png` | `Th.png` | رمز التسجيل (مكتبة الرموز) |
| `/huda/shapes/chevron-down.png` | `gZ.9.png` | سهم قائمة منسدلة |
| `/huda/shapes/divider.png` | `gj.9.png` | فاصل أفقي |

## الفهرس الكامل

`/huda/catalog.json` يحوي **كل ملفات الحزمة الأصلية** (331 ملفًا) مع أبعادها وتصنيفها —
بما فيها خلفيات 9-patch وتخطيطات XML المُصرَّفة التي لا تصلح للويب مباشرة، لكنها موثقة
لأغراض الأرشفة والمرجعية.

## ملاحظة ترخيصية

المستودع المصدري **لا يتضمن ملف ترخيص صريحًا** وقت التحميل؛ الأصول مُستقاة من مشروع
مفتوح منشور علنًا (GitHub: so7ob/HUDA) وتُستخدم هنا بوصفها أصول واجهة مرجعية مع
الإشارة الكاملة إلى مصدرها. للنشر التجاري يجب التحقق من رخصة الأصول مع مالكها.
