# خطة نقل التجربة إلى Flutter/Android — نور الهدى

> **سياق صادق:** بيئة التطوير الحالية (حاضنة ويب بمنفذ خارجي وحيد) لا تتيح بناء أو تشغيل حزمة APK. لذلك سُلِّمت التجربة الكاملة كتطبيق ويب PWA-style يعمل الآن، مع هذه الخطة التنفيذية التي تنقل **نفس البنية والوظائف** إلى Flutter دون إعادة تصميم.

## 1) خريطة النقل (Web → Flutter)

| مكوّن الويب الحالي | المقابل في Flutter | ملاحظات |
|---|---|---|
| Next.js API routes | NestJS + MariaDB (كما طلبت المواصفات) | عقود الـ API في `src/lib/api.ts` جاهزة كعقد OpenAPI — نفس المسارات والأسماء |
| Prisma/SQLite | Drift (محلي) + MariaDB (خادم) | مخطط `prisma/schema.prisma` يُترجم 1:1 إلى جداول Drift |
| `useAppStore` (Zustand) | Riverpod (StateNotifier/AsyncNotifier) | نفس الحالات: tab, overlay, readerPrefs, player |
| مكوّنات الشاشات | Flutter Widgets + goRouter | كل شاشة React تقابل Widget واحدًا بالاسم نفسه |
| Tailwind tokens | ThemeData + Design Tokens Dart | نفس القيم: `#329B9C/#247E83/#F8FDFC/#EBFBFA/#E9EEE2/#283333` |
| next/font | google_fonts (Tajawal/Amiri/Amiri Quran) | تضمين محلي للخطوط في الأصول |
| HTMLAudio | just_audio + audio_service | إشعار وسائط وشاشة قفل جاهزان |
| Notification API + Interval | flutter_local_notifications + timezone | تذكيرات تعمل بالخلفية فعلًا |
| ذاكرة المتصفح للتنزيلات | ملفات محلية + sqflite سجل | تنزيل حقيقي قابل للاستئناف |
| وسم dir="rtl" | Directionality + `flutter_localizations` ar | RTL أصلي في Flutter |

## 2) بنية المشروع المقترحة (Clean Architecture + Feature-Based)

```
apps/mobile/lib/
├── core/                    # tokens, theme, router, utils, error
├── data/
│   ├── local/               # Drift: نفس جداول schema.prisma
│   ├── remote/              # Dio + نفس عقود api.ts
│   └── repositories/
├── domain/                  # كيانات + واجهات مستودعات
└── features/
    ├── quran/               # home, reader(list/mushaf), tafsir, topics
    ├── search/              # نفس التطبيع العربي (lib/arabic.dart)
    ├── library/             # sections, book detail, book reader
    ├── prophet/             # شاشة مجمِّعة من المحرك
    ├── plans/               # wird, daily, ramadan, logs
    ├── player/              # audio_engine (منطق audio-engine.tsx نفسه)
    ├── settings/            # 9 شاشات + admin panel
    └── notifications/       # scheduler (منطق useNotificationScheduler نفسه)
```

## 3) خطوات التنفيذ المرتبة
1. **البنية**: مشروع Flutter + riverpod + goRouter + drift + dio + just_audio/audio_service + flutter_local_notifications.
2. **نقل التوكِنز**: ThemeData من `globals.css` (متغيرات CSS → `Color(0xFF...)`).
3. **قاعدة البيانات**: توليد Drift من جداول Prisma نفسها، ونسخ `db/cache/*.json` كأصول أولية للتهيئة الأولى (Offline-first).
4. **منطق محلي صرف النقل**: `lib/arabic.ts` → `arabic.dart` (دوال التطبيع حرفيًا)، منطق `AudioEngine` و`useNotificationScheduler` → Controllers.
5. **الشاشات**: كل شاشة ويب لها مواصفات بصرية موثقة في هذا المستودع (لقطات المعاينة + tokens) — تُبنى Widgets مطابقة.
6. **الخادم**: NestJS بنفس مسارات `src/app/api/**` (جاهزة كـ contracts) + MariaDB + نفس مخطط الجداول.
7. **الاختبارات**: اختبارات وحدة للتطبيع والأرقام، golden tests للشاشات، اختبار تطابق 6236 آية/604 صفحات بعد الاستيراد.

## 4) الالتزامات التي يجب أن تنتقل كما هي
- النص القرآني للقراءة فقط — لا محرر إداري للآيات إطلاقًا.
- كل آية ملف صوتي مستقل = تظليل دقيق بلا توقيتات خارجية.
- سير النشر الخماسي + سجل التدقيق + فصل بيانات المستخدم عن المرجع.
- لا تتبع ولا إعلانات، والعمل دون إنترنت شرط أساسي.

## 5) ما يُحل تلقائيًا في نسخة الجوال
- تخزين ملفات التلاوة كاملة محليًا (مع حجم حقيقي واستئناف تنزيل).
- تذكيرات بالخلفية عبر AlarmManager داخل flutter_local_notifications.
- التحكم من شاشة القفل عبر audio_service (MediaSession).
- حزم محتوى قابلة للتنزيل بتحقق SHA-256 وتوقيع رقمي عند الاعتماد البعيد.
