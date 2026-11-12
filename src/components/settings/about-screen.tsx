"use client";

/**
 * overlay «حول التطبيق» — الهوية، المصادر المعتمدة بدقة، الخصوصية، وإصدارات الحزم.
 */
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, BookOpen, ScrollText, AudioLines, ShieldCheck, Sparkles, Box, Shapes, PhoneCall } from "lucide-react";

import { api } from "@/lib/api";
import { HudaImg, HUDA_ASSETS } from "@/components/shared/huda-assets";
import { toArabicDigits } from "@/components/shared/ornaments";
import { Skeleton } from "@/components/ui/skeleton";

function OverlayHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-header-gradient header-pattern overflow-hidden text-white shadow-md">
      <div className="max-w-lg mx-auto h-14 px-2 flex items-center justify-between">
        <button
          onClick={onClose}
          aria-label="رجوع"
          className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronRight size={24} strokeWidth={1.8} />
        </button>
        <h1 className="font-ui font-bold text-lg">{title}</h1>
        <span className="w-11 shrink-0" aria-hidden="true" />
      </div>
    </header>
  );
}

/** قسم بعنوان فيروزي ومحتوى في بطاقة */
function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <section className="anim-fade-up">
      <h2 className="flex items-center gap-2 font-bold text-ink text-[15px] mb-2 px-1">
        <Icon size={17} className="text-teal-dark" aria-hidden="true" />
        {title}
      </h2>
      <div className="bg-card rounded-2xl shadow-sm">{children}</div>
    </section>
  );
}

/** سطر مصدر داخل القسم */
function SourceRow({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof BookOpen;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="w-9 h-9 rounded-lg bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="font-bold text-ink text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

/** مكتبة الرموز والأشكال من أصول «هدى الله» (res.zip) — tone: white = أيقونة بيضاء تحتاج تعتيماً على الفاتح */
const SYMBOLS_GALLERY: { src: string; label: string; tone?: "white" | "dark" }[] = [
  { src: HUDA_ASSETS.player.play, label: "تشغيل", tone: "white" },
  { src: HUDA_ASSETS.player.pause, label: "إيقاف مؤقت", tone: "white" },
  { src: HUDA_ASSETS.player.prev, label: "السابق", tone: "white" },
  { src: HUDA_ASSETS.player.next, label: "التالي", tone: "white" },
  { src: HUDA_ASSETS.player.rewind, label: "إعادة للخلف", tone: "white" },
  { src: HUDA_ASSETS.player.forward, label: "تقديم سريع", tone: "white" },
  { src: HUDA_ASSETS.player.stop, label: "إيقاف تام", tone: "dark" },
  { src: HUDA_ASSETS.shapes.dropletTeal, label: "قطرة الورد" },
  { src: HUDA_ASSETS.shapes.droplet, label: "قطرة" },
  { src: HUDA_ASSETS.shapes.dropletBig, label: "قطرة كبيرة" },
  { src: HUDA_ASSETS.shapes.dropletSmall, label: "قطرة صغيرة" },
  { src: HUDA_ASSETS.shapes.check, label: "تحديد", tone: "dark" },
  { src: HUDA_ASSETS.shapes.checkSmall, label: "تحديد مصغّر", tone: "dark" },
  { src: HUDA_ASSETS.shapes.arrowOpen, label: "فتح رابط", tone: "white" },
  { src: HUDA_ASSETS.shapes.phone, label: "هاتف", tone: "dark" },
  { src: HUDA_ASSETS.shapes.video, label: "فيديو", tone: "dark" },
  { src: HUDA_ASSETS.shapes.circleRing, label: "حلقة", tone: "dark" },
  { src: HUDA_ASSETS.shapes.circleDot, label: "نقطة", tone: "dark" },
  { src: HUDA_ASSETS.shapes.squareRing, label: "مربع", tone: "dark" },
  { src: HUDA_ASSETS.shapes.record, label: "تسجيل", tone: "dark" },
  { src: HUDA_ASSETS.shapes.chevronDown, label: "سهم قائمة", tone: "white" },
  { src: HUDA_ASSETS.shapes.divider, label: "فاصل", tone: "dark" },
];

/** صنف تلوين الرمز حسب نبرته: الأبيض يُعتّم على الفاتح ويعود أبيض في الداكن */
const toneClass = (tone?: "white" | "dark") =>
  tone === "white" ? "brightness-0 dark:brightness-100" : tone === "dark" ? "dark:invert" : undefined;

export function AboutScreen({ onClose }: { onClose: () => void }) {
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: api.packages,
  });
  const packages = packagesData?.packages ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="حول التطبيق" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-5 pb-28 space-y-5">
        {/* ✦ الهوية ✦ — شعار ونقش من أصول «هدى الله» */}
        <section className="relative flex flex-col items-center text-center space-y-2.5 anim-fade-up overflow-hidden rounded-3xl pt-6 pb-5 px-4 bg-card shadow-sm" aria-label="هوية التطبيق">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: `url(${HUDA_ASSETS.pattern})`, backgroundSize: "220px" }}
            aria-hidden="true"
          />
          <HudaImg src={HUDA_ASSETS.logo} size={96} className="relative rounded-3xl shadow-lg ring-1 ring-border/50" alt="شعار نور الهدى — قطرة بشعار قرآني" />
          <h2 className="relative font-ui font-bold text-2xl text-ink">نور الهدى</h2>
          <p className="relative text-sm text-muted-foreground">تطبيق قرآني وثقافي متكامل</p>
          <span className="relative rounded-full border border-gold/50 bg-cream px-3 py-1 text-[11px] font-bold text-gold-deep">
            الإصدار {toArabicDigits("1.0.0")}
          </span>
        </section>

        {/* ✦ مصادر البيانات المعتمدة ✦ */}
        <Section icon={BookOpen} title="مصادر البيانات المعتمدة">
          <div className="divide-y divide-border/60">
            <SourceRow
              icon={BookOpen}
              label="النص القرآني"
              detail={`نص عثماني برواية حفص (Tanzil — ترخيص مفتوح) — ${toArabicDigits(604)} صفحات / ${toArabicDigits(30)} جزءًا`}
            />
            <SourceRow
              icon={ScrollText}
              label="التفسير الميسّر"
              detail="مجمع الملك فهد لطباعة المصحف الشريف"
            />
            <SourceRow
              icon={AudioLines}
              label="التلاوات"
              detail="cdn.islamic.network (everyayah) — لكل آية ملف مستقل"
            />
            <SourceRow
              icon={Shapes}
              label="أصول الواجهة (الرموز والأشكال)"
              detail="مستودع HUDA المفتوح (GitHub: so7ob/HUDA) — ملف res.zip: شعار، رموز مشغّل، قطرات، وأنماط زخرفية مع فهرس كامل في /huda/catalog.json"
            />
          </div>
        </Section>

        {/* ✦ الخصوصية ✦ */}
        <Section icon={ShieldCheck} title="الخصوصية">
          <p className="px-4 py-3.5 text-xs text-ink/75 leading-relaxed">
            لا حسابات ولا تتبع ولا إعلانات؛ بياناتك محفوظة محليًا على جهازك ولا تغادر التطبيق.
          </p>
        </Section>

        {/* ✦ الهوية المستقلة ✦ */}
        <Section icon={Sparkles} title="الهوية">
          <p className="px-4 py-3.5 text-xs text-ink/75 leading-relaxed">
            هوية مستقلة تجمع بين زخارف أصلية مرسومة خصيصًا ورموز وأشكال مرجعية من أصول مفتوحة موثّقة المصدر — غير تابع لأي علامة تجارية أخرى.
          </p>
        </Section>

        {/* ✦ مكتبة الرموز والأشكال — أصول «هدى الله» ✦ */}
        <Section icon={Shapes} title="مكتبة الرموز والأشكال">
          <div className="px-4 pt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              رموز وأشكال التطبيق المستقاة من حزمة أصول «هدى الله» المفتوحة (res.zip) — الشعار، رموز المشغّل، قطرات الورد، والأشكال الزخرفية:
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto nice-scrollbar px-4 py-3" role="list" aria-label="معرض رموز وأشكال التطبيق">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {SYMBOLS_GALLERY.map((s) => (
                <div
                  key={s.src}
                  role="listitem"
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-accent/50 border border-border/50 p-2"
                >
                  <span className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm">
                    <HudaImg src={s.src} size={24} className={toneClass(s.tone)} />
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</span>
                </div>
              ))}
              {/* الشعار والنقش */}
              <div role="listitem" className="flex flex-col items-center gap-1.5 rounded-xl bg-accent/50 border border-border/50 p-2">
                <span className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm overflow-hidden">
                  <HudaImg src={HUDA_ASSETS.logo} size={30} />
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">الشعار</span>
              </div>
              <div role="listitem" className="flex flex-col items-center gap-1.5 rounded-xl bg-accent/50 border border-border/50 p-2">
                <span className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm overflow-hidden">
                  <span className="w-8 h-8 rounded" style={{ backgroundImage: `url(${HUDA_ASSETS.pattern})`, backgroundSize: "cover" }} aria-hidden="true" />
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">نقش زخرفي</span>
              </div>
            </div>
          </div>
          <div className="px-4 pb-3.5">
            <a
              href="https://github.com/so7ob/HUDA"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-teal-dark hover:underline"
            >
              <HudaImg src={HUDA_ASSETS.shapes.arrowOpen} size={14} className="brightness-0 dark:brightness-100 opacity-70" />
              المستودع المصدري على GitHub — so7ob/HUDA
            </a>
          </div>
        </Section>

        {/* ✦ الدعم والتواصل ✦ */}
        <Section icon={PhoneCall} title="الدعم والتواصل">
          <div className="divide-y divide-border/60">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="w-9 h-9 rounded-lg bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
                <HudaImg src={HUDA_ASSETS.shapes.phone} size={18} className="brightness-0 dark:invert" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-ink text-sm">للتواصل والمقترحات</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">عبر مستودع المشروع المفتوح — قضايا وطلبات الميزات</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="w-9 h-9 rounded-lg bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
                <HudaImg src={HUDA_ASSETS.shapes.video} size={18} className="brightness-0 dark:invert" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-ink text-sm">فيديو تعريفي بالتطبيق</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">جولة مصوّرة على الميزات — تُضاف في التحديثات القادمة</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ✦ إصدارات حزم المحتوى ✦ */}
        {packagesLoading ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : packages.length > 0 ? (
          <Section icon={Box} title="إصدارات حزم المحتوى">
            <div className="divide-y divide-border/60">
              {packages.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-bold text-ink">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    الإصدار {toArabicDigits(p.version)} · {p.sizeLabel}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          صُنع بعناية لخدمة كتاب الله — جميع الحقوق لله
        </p>
      </main>
    </div>
  );
}
