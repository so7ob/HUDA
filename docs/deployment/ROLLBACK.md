# الاسترجاع — ROLLBACK

## 1) الاسترجاع التلقائي (مدمج في deploy.sh)

إذا فشل فحص الصحة بعد التبديل، ينفّذ السكربت فوراً:
1. إعادة symlink `current` إلى مجلد الإصدار السابق (محفوظ قبل التبديل).
2. `systemctl restart`.
3. طباعة آخر 50 سطر journalctl والخروج فاشلاً → الـ workflow يعتبر النشر فاشلاً.

**لا تدخل بشري مطلوب** — الإصدار السابق يستمر في الخدمة.

## 2) الاسترجاع اليدوي (عند اكتشاف خلل لاحقاً)

```bash
# اعرض الإصدارات المتاحة (آخر 10)
ls -1t /opt/huda/production/releases/

# أعِد التوجيه إلى إصدار سليم
ln -sfn /opt/huda/production/releases/<TIMESTAMP_SALEM> /opt/huda/production/.current-new
mv -Tf /opt/huda/production/.current-new /opt/huda/production/current
systemctl restart huda@production

# تحقق
curl -s http://127.0.0.1:3000/api/health
journalctl -u huda@production -n 30 --no-pager
```

## 3) استرجاع قاعدة البيانات

النسخ موجودة في `/opt/huda/<instance>/data/backups/` (آخر 10، تُؤخذ تلقائياً قبل كل نشر):

```bash
# أوقف الكتابة أولاً (اختياري لكن أنسب)
sudo systemctl stop huda@production

# تحقق من سلامة النسخة قبل الاستعادة
sqlite3 data/backups/<TIMESTAMP>.db "PRAGMA integrity_check; SELECT count(*) FROM QuranAyah;"

# استعادة
cp data/backups/<TIMESTAMP>.db data/app.db
chown huda:huda data/app.db

sudo systemctl start huda@production
curl -s http://127.0.0.1:3000/api/health
```

**تنبيه:** الاستعادة تعيد البيانات إلى لحظة النسخة — أي تغييرات مستخدم لاحقة (حفظات، تقدم قراءة) تُفقد؛ وثّق ذلك عند التنفيذ.

## 4) استرجاع "إصدار GitHub" خاطئ

- احذف/عدّل الـ Release من واجهة GitHub (لا يتراجع التاج تلقائياً).
- لا تُعد كتابة تاريخ main أبداً: أنشئ إصلاحاً جديداً `hotfix/*` من main وأصدر Patch.
- إن كان الـ tag نفسه خاطئاً (وليس على commit من main): احذف الـ tag والrelease من GitHub فقط، وأعد الوسم على الـ commit الصحيح.

## 5) اختبار الاسترجاع الدوري

إجباري بعد أول نشر إنتاجي ناجح، ثم شهرياً:
1. خذ النسخة الأخيرة واستعدها في بيئة تجريبية (`/tmp`).
2. افحص integrity + عينة قراءة (آيات، حفظات).
3. سجّل النتيجة في `docs/audit/QUALITY_REPORT.md`.
