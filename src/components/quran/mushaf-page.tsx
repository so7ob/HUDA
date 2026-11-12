"use client";

/**
 * عرض صفحة المصحف المدني بالخطوط المرخصة QCF (مجمع الملك فهد)
 * — كل صفحة لها خط مستقل QCF_P###.TTF يُحمَّل عند الطلب
 * — الرسم والتشكيل والعلامات كما هي من المصدر المعتمد دون أي تعديل
 * — سطر لكل سطر من سطور الصفحة الخمسة عشر في الرسم المدني
 * — نقر الكلمة يحدد آيتها، والتظليل يتبع الآية المسموعة/المحددة
 */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toArabicDigits } from "@/components/shared/ornaments";

/* ---------- تحميل الخطوط ---------- */
const fontCache = new Set<string>();

export async function loadQcfFont(page: number): Promise<boolean> {
  const fam = `QCF-P${page}`;
  if (fontCache.has(fam)) return true;
  if (typeof document === "undefined" || !("fonts" in document)) return false;
  try {
    const ff = new FontFace(fam, `url(/fonts/qcf/QCF_P${String(page).padStart(3, "0")}.TTF)`);
    await ff.load();
    document.fonts.add(ff);
    fontCache.add(fam);
    return true;
  } catch {
    return false;
  }
}

let bsmlLoading: Promise<boolean> | null = null;
let bsmlAdded = false;
export function loadBsmlFont(): Promise<boolean> {
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve(false);
  if (bsmlAdded) return Promise.resolve(true);
  bsmlLoading ??= (async () => {
    try {
      const ff = new FontFace("QCF-BSML", "url(/fonts/QCF_BSML.TTF)");
      await ff.load();
      document.fonts.add(ff);
      bsmlAdded = true;
      return true;
    } catch {
      return false;
    }
  })();
  return bsmlLoading;
}

/** جملة البسملة بخط الترويسة المرخص (رموز البسملة الممدودة) */
export const BISMILLAH_GLYPHS = "\u{FB51}\u{FB52}\u{FB53}\u{FB54}";

/* ---------- الأنواع ---------- */
export interface GlyphItem {
  c: string;
  t: number;
  ay: number;
  s: number;
  aid: number;
}

export interface MushafSlot {
  kind: "text" | "header" | "bismillah";
  line?: number;
  items?: GlyphItem[];
  surah?: number;
  surahName?: string;
  withBismillahInline?: boolean;
}

interface MushafPageProps {
  page: number;
  slots: MushafSlot[];
  selectedAyahId: number | null;
  playingAyahId: number | null;
  onSelectAyah: (surah: number, ayahInSurah: number, ayahId: number) => void;
  brightness: number; // 0..1
}

const TOTAL_LINES = 15;
const PAGE_RATIO = 1.4; // نسبة ارتفاع الصفحة إلى عرضها (المصحف المدني)

export function MushafPage({
  page,
  slots,
  selectedAyahId,
  playingAyahId,
  onSelectAyah,
  brightness,
}: MushafPageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLDivElement>(null);
  const [fontState, setFontState] = useState<{ page: number; ready: boolean }>({ page, ready: false });
  const fontReady = fontState.page === page && fontState.ready;
  const [fontSize, setFontSize] = useState(0);
  const [bsmlSize, setBsmlSize] = useState(0);
  // نسبة عرض كل سطر إلى أطول سطر — لتحديد السطور القصيرة (محاذاة يمين كالمصحف)
  const [lineRatios, setLineRatios] = useState<number[]>([]);
  const [bsmlReady, setBsmlReady] = useState(false);

  // تحميل خط الصفحة + خط البسملة + التحميل المسبق للصفحات المجاورة
  useEffect(() => {
    let alive = true;
    loadQcfFont(page).then((ok) => {
      if (alive) setFontState({ page, ready: ok });
    });
    loadBsmlFont().then((ok) => alive && setBsmlReady(ok));
    // تحميل مسبق للصفحة التالية والسابقة
    for (const nb of [page + 1, page - 1]) {
      if (nb >= 1 && nb <= 604) loadQcfFont(nb);
    }
    return () => {
      alive = false;
    };
  }, [page]);

  // قياس أطول سطر وضبط حجم الخط ليملأ العرض تمامًا
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const measurer = measurerRef.current;
    if (!wrap || !measurer || !fontReady) return;
    const avail = wrap.clientWidth;
    if (avail < 60) return;
    const widths: number[] = [];
    for (const child of Array.from(measurer.children)) {
      widths.push((child as HTMLElement).getBoundingClientRect().width);
    }
    // آخر عنصر في المقيس هو البسملة بخط الترويسة
    const bsmlW = widths.pop() ?? 0;
    const maxW = Math.max(1, ...widths);
    setFontSize((avail * 0.965 * 100) / maxW);
    setLineRatios(widths.map((w) => w / maxW));
    if (bsmlW > 0) setBsmlSize((avail * 0.8 * 100) / bsmlW);
  }, [fontReady, bsmlReady]);

  useLayoutEffect(() => {
    measure();
  }, [measure, slots, page]);

  // إعادة القياس عند تغيّر العرض
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure]);

  const pageH = useRef<number>(0);

  const textLines = slots.filter((s) => s.kind === "text");

  return (
    <div ref={wrapRef} className="relative w-full" style={{ filter: `brightness(${0.82 + brightness * 0.36})` }}>
      {/* المقيس الخفي — نفس السطور بحجم 100px لحساب نسبة الملاءمة
          + عنصر أخير يقيس عرض البسملة بخط الترويسة */}
      <div
        ref={measurerRef}
        aria-hidden="true"
        className="absolute -z-10 opacity-0 pointer-events-none"
        style={{ whiteSpace: "nowrap", fontFamily: `QCF-P${page}`, fontSize: 100, direction: "rtl", top: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}
      >
        {textLines.map((s, i) => (
          <div key={i}>{(s.items ?? []).map((it) => it.c).join(" ")}</div>
        ))}
        <div style={{ fontFamily: "QCF-BSML" }}>{BISMILLAH_GLYPHS}</div>
      </div>

      {/* الصفحة */}
      <div
        className="bg-reading-gradient rounded-2xl border border-gold/30 shadow-lg relative overflow-hidden mx-auto w-full"
        ref={(el) => {
          if (el) pageH.current = el.clientWidth;
        }}
      >
        {/* الإطار الداخلي */}
        <div className="absolute inset-1.5 border border-gold/25 rounded-xl pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-3 border border-gold/15 rounded-lg pointer-events-none" aria-hidden="true" />

        {/* محتوى الصفحة: سطور النص تتمدد لتملأ الصفحة بالتوزيع التدفقي
            (مطابق لمظهر المصحف المدني في صفحات بدايات السور قليلة السطور) */}
        <div
          className="relative flex flex-col"
          style={{ height: `calc(min(100vw - 44px, 560px) * ${PAGE_RATIO})`, opacity: fontReady ? 1 : 0, transition: "opacity .25s" }}
        >
          {(() => {
            let textIdx = -1; // عدّاد السطور النصية لمطابقة نسب القياس
            return slots.map((slot, idx) => {
            const slotH = `calc((min(100vw - 44px, 560px) * ${PAGE_RATIO}) / ${TOTAL_LINES})`;
            if (slot.kind === "header") {
              // صندوق السورة — ومعه البسملة بنفس السطر حين لا تتسع الصفحة
              if (slot.withBismillahInline) {
                return (
                  <div key={idx} className="flex items-center justify-center gap-2 px-4 shrink-0" style={{ height: slotH }}>
                    <div className="surah-frame py-0.5 px-3 flex items-center justify-center gap-1.5 rounded-full border-gold/60 shrink-0">
                      <span className="text-gold-deep text-[9px]" aria-hidden="true">❖</span>
                      <span className="font-quran text-ink/90 leading-tight" style={{ fontSize: "min(3.6vw, 16px)" }}>
                        سُورَةُ {slot.surahName}
                      </span>
                    </div>
                    {bsmlReady && bsmlSize > 0 ? (
                      <span
                        className="text-ink shrink-0"
                        style={{ fontFamily: "QCF-BSML", fontSize: `${bsmlSize * 0.52}px`, lineHeight: 1.05, direction: "rtl" }}
                        aria-label="بسم الله الرحمن الرحيم"
                      >
                        {BISMILLAH_GLYPHS}
                      </span>
                    ) : (
                      <span className="font-quran text-ink shrink-0" style={{ fontSize: "min(3vw, 13px)" }}>
                        بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                      </span>
                    )}
                  </div>
                );
              }
              return (
                <div key={idx} className="flex items-center justify-center px-6 shrink-0" style={{ height: slotH }}>
                  <div className="surah-frame w-full max-w-[94%] py-0.5 flex items-center justify-center gap-2 rounded-full border-gold/60">
                    <span className="text-gold-deep text-[10px]" aria-hidden="true">❖</span>
                    <span className="font-quran text-ink/90 leading-tight" style={{ fontSize: "min(4.4vw, 20px)" }}>
                      سُورَةُ {slot.surahName}
                    </span>
                    <span className="text-gold-deep text-[10px]" aria-hidden="true">❖</span>
                  </div>
                </div>
              );
            }
            if (slot.kind === "bismillah") {
              return (
                <div key={idx} className="flex items-center justify-center overflow-visible shrink-0" style={{ height: slotH }}>
                  {bsmlReady && bsmlSize > 0 ? (
                    <span
                      className="text-ink"
                      style={{ fontFamily: "QCF-BSML", fontSize: `${bsmlSize}px`, lineHeight: 1.05, direction: "rtl" }}
                    >
                      {BISMILLAH_GLYPHS}
                    </span>
                  ) : (
                    <span className="font-quran text-ink" style={{ fontSize: `calc(${slotH} * 0.5)` }}>
                      بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                    </span>
                  )}
                </div>
              );
            }
            const items = slot.items ?? [];
            textIdx++;
            // السطور القصيرة (نهاية سورة/صفحة) تُحاذى يمينًا كالمصحف
            const ratio = lineRatios[textIdx] ?? 1;
            const isShort = ratio < 0.96;
            return (
              <div
                key={idx}
                dir="rtl"
                className="flex items-center overflow-visible select-text flex-1 min-h-0"
                style={{ justifyContent: isShort ? "flex-start" : "center", paddingLeft: isShort ? 8 : 0 }}
              >
                <span
                  className="whitespace-nowrap text-ink block text-center"
                  style={{
                    fontFamily: `QCF-P${page}`,
                    fontSize: fontSize ? `${fontSize}px` : "16px",
                    lineHeight: 1,
                    visibility: fontReady ? "visible" : "hidden",
                  }}
                >
                  {items.map((it, i) => {
                    const active = it.aid === selectedAyahId || it.aid === playingAyahId;
                    return (
                      <span
                        key={i}
                        onClick={() => onSelectAyah(it.s, it.ay, it.aid)}
                        className={cn(
                          "cursor-pointer rounded transition-colors duration-150",
                          active ? "bg-gold/35 shadow-sm" : "hover:bg-gold/15"
                        )}
                        title={`سورة ${it.s} — آية ${it.ay}`}
                        role="button"
                        tabIndex={-1}
                      >
                        {it.c}
                        {i < items.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
            });
          })()}
        </div>

        {/* رقم الصفحة أسفل الإطار */}
        <div className="pb-3 -mt-1 text-center">
          <span className="inline-block bg-cream text-gold-deep rounded-full px-3.5 py-0.5 font-book text-[13px] border border-gold/40">
            ❁ {toArabicDigits(page)} ❁
          </span>
        </div>
      </div>
    </div>
  );
}
