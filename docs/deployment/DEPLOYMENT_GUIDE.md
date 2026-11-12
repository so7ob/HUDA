# دليل النشر — DEPLOYMENT_GUIDE

## المعمارية المعتمدة (بلا Docker)

```text
GitHub main (tag v*)
  ↓ production.yml (بوابة PRODUCTION_DEPLOY_ENABLED + environment approval)
Build artifact (Next.js standalone + prisma/schema + deploy scripts)
  ↓ SSH (deploy.sh)
Server Debian 12:
  /opt/huda/<instance>/
  ├── current -> releases/<timestamp>     # تبديل symlink ذري
  ├── releases/                            # آخر 10 إصدارات (rollback فوري)
  ├── data/app.db                          # قاعدة البيانات — خارج شجرة الإصدار
  ├── data/backups/                        # نسخ متسقة قبل كل نشر
  ├── huda.env                             # متغيرات البيئة (chmod 600)
  systemd: huda@staging (:3001) / huda@production (:3000)
  ↓
Nginx reverse proxy + HTTPS (Let's Encrypt)
```

## تحضير الخادم (مرة واحدة)

```bash
# مستخدم خدمة معزول
sudo adduser --system --group --home /opt/huda huda

# Bun (وقت التشغيل)
sudo -u huda -H bash -c 'curl -fsSL https://bun.sh/install | bash'
# تأكد: which bun => /home/huda/.bun/bin/bun أو ضعه في /usr/bin/bun

# sqlite3 (للنسخ المتسقة — fallback النشر ملفي إن غاب)
sudo apt install -y sqlite3

# بنية المجلدات
sudo -u huda mkdir -p /opt/huda/{staging,production}/{releases,data/backups}
sudo -u huda touch /opt/huda/staging/huda.env /opt/huda/production/huda.env
sudo -u huda chmod 600 /opt/huda/{staging,production}/huda.env
```

`huda.env` للإنتاج (مثال):
```env
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=file:/opt/huda/production/data/app.db
NODE_ENV=production
```
للـ Staging نفسه مع `PORT=3001` ومسار `/opt/huda/staging/data/app.db`.

## وحدة systemd

```bash
sudo cp scripts/deploy/huda-web.service /etc/systemd/system/huda@.service
sudo systemctl daemon-reload
sudo systemctl enable --now huda@production huda@staging
```

## Nginx + HTTPS

```bash
sudo cp scripts/deploy/nginx-huda.conf /etc/nginx/sites-available/huda-production
# عدّل DOMAIN_PLACEHOLDER و PORT_PLACEHOLDER (3000 للإنتاج، 3001 للتجريبي)
sudo certbot certonly --nginx -d <النطاق>
sudo ln -s /etc/nginx/sites-available/huda-production /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## الأسرار المطلوبة في GitHub (Secrets — لا شيء في المستودع)

| السر | الاستخدام |
|---|---|
| `STAGING_HOST` / `PRODUCTION_HOST` | عنوان خادم SSH |
| `STAGING_SSH_KEY` / `PRODUCTION_SSH_KEY` | مفتاح SSH خاص مخصص للنشر فقط |
| `STAGING_DEPLOY_PATH` / `PRODUCTION_DEPLOY_PATH` | مثل `/opt/huda/staging` |

ومتغيرات المستودع (Vars): `STAGING_DEPLOY_ENABLED`، `PRODUCTION_DEPLOY_ENABLED`، `STAGING_SERVICE`، `PRODUCTION_SERVICE`، `STAGING_HEALTH_URL`، `PRODUCTION_HEALTH_URL`.

## تدفق النشر الفعلي (deploy.sh)

1. رفع الـ artifact إلى `/tmp` على الخادم.
2. فك الضغط في `releases/<timestamp>` (شجرة إصدار جديدة لا تُلمس).
3. **نسخة متسقة** من `data/app.db` عبر `sqlite3 .backup` (fallback: نسخ ملف) — احتفاظ بآخر 10.
4. تبديل symlink `current` ذرياً (mv -Tf) ثم `systemctl restart`.
5. فحص صحة حتى 30 محاولة على `/api/health` (يجب `"status":"ok"`).
6. عند الفشل: rollback تلقائي إلى الإصدار السابق + إعادة تشغيل + سجلات journalctl + خروج فاشل.
7. فحص دخان نهائي + `DEPLOY_RESULT=success`.

## قواعد قاعدة البيانات الإنتاجية (حرجة)

- `app.db` **خارج** شجرة الإصدار دائماً — النشر لا يكتب فوقها أبداً.
- قبل أي تغيير مخطط: نسخة متسقة إجبارية (تلقائية في deploy.sh).
- التغييرات المخططية يدوية موثقة: من checkout للإصدار الجديد على الخادم:
  `DATABASE_URL=file:/opt/huda/production/data/app.db bunx prisma db push --skip-generate`
  (يرفض التغييرات الهادمة افتراضياً — **ممنوع** `--accept-data-loss`).
- اختبر الاسترجاع دورياً: `sqlite3 data/backups/<نسخة>.db ".restore /tmp/test.db"` ثم فحص جداول.

## التشخيص السريع

```bash
systemctl status huda@production
journalctl -u huda@production -n 100 --no-pager
curl -s http://127.0.0.1:3000/api/health
readlink /opt/huda/production/current
```
