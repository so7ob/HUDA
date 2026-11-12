"use client";

/**
 * محرك عرض القرآن — وضع القائمة
 * مطابق لطابع لقطات الشاشة المرجعية: إطار زخرفي لاسم السورة،
 * آيات بخط مصحفي، أرقام مزخرفة، تظليل الآية الجارية/المحددة،
 * زر تلاوة عائم، ورقم الصفحة أسفل.
 */
import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { OrnamentHeaderBox, AyahNumber, toArabicDigits, Flourish } from "@/components/shared/ornaments";
import { cn } from "@/lib/utils";
import type { AyahWithTafsir } from "@/lib/api";
import { useAppStore } from "@/lib/store";

interface ListModeProps {
  surahName: string;
  surahNumber: number;
  ayahs: AyahWithTafsir[];
  selectedAyahId: number | null;
  playingAyahId: number | null;
  onSelectAyah: (a: AyahWithTafsir, el: HTMLElement) => void;
  pageFrom: number;
  pageTo: number;
  autoScrolling: boolean;
  onToggleAutoScroll: () => void;
  aufScrollSpeed: number;
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

export function ReaderListMode({
  surahName,
  surahNumber,
  ayahs,
  selectedAyahId,
  playingAyahId,
  onSelectAyah,
  pageFrom,
  pageTo,
  autoScrolling,
  onToggleAutoScroll,
  aufScrollSpeed,
}: ListModeProps) {
  const prefs = useAppStore((s) => s.readerPrefs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);

  // تمرير إلى الآية المحددة عند الفتح
  useEffect(() => {
    if (selectedAyahId) {
      const el = document.getElementById(`ayah-${selectedAyahId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedAyahId, ayahs.length]);

  // ✦ التمرير التلقائي القابل للإيقاف والاستكمال دون فقدان الموضع ✦
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  useEffect(() => {
    if (!autoScrolling) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const container = containerRef.current?.parentElement; // منطقة التمرير هي النافذة نفسها
    let paused = false;
    const onUserScroll = () => {
      if (!lastTsRef.current) return;
      paused = true;
    };
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    const step = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (!paused) {
        window.scrollBy({ top: aufScrollSpeed * dt, behavior: "auto" });
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
      void container;
      void paused;
    };
  }, [autoScrolling, aufScrollSpeed]);

  // إيقاف التمرير التلقائي عند الوصول للأسفل
  useEffect(() => {
    const onScroll = () => {
      if (autoScrolling && window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        onToggleAutoScroll();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoScrolling, onToggleAutoScroll]);

  const isMakkahFirst = surahNumber === 1;
  const showBismillah = surahNumber !== 1 && surahNumber !== 9;

  const handleSelect = (a: AyahWithTafsir, e: React.MouseEvent<HTMLDivElement>) => {
    setSelectedEl(e.currentTarget);
    onSelectAyah(a, e.currentTarget);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* اسم السورة داخل الإطار الزخرفي */}
      <OrnamentHeaderBox
        title={`سُورَةُ ${surahName}`}
        className="mt-2 mb-4"
      />

      {showBismillah && (
        <div className="flex items-center justify-center gap-2 mb-5 px-6">
          <Flourish className="w-10 text-gold-deep/60" flip />
          <p className="font-quran text-center text-teal-dark/90" style={{ fontSize: prefs.fontSize * 0.85 }}>
            {BISMILLAH}
          </p>
          <Flourish className="w-10 text-gold-deep/60" />
        </div>
      )}

      {/* الآيات */}
      <div
        className="bg-reading-gradient rounded-3xl px-3 py-6 card-soft"
        style={{
          filter: `brightness(${0.85 + prefs.brightness * 0.3})`,
        }}
      >
        {ayahs.map((a) => {
          const isSelected = selectedAyahId === a.id;
          const isPlaying = playingAyahId === a.id;
          return (
            <motion.div
              key={a.id}
              id={`ayah-${a.id}`}
              layout="position"
              onClick={(e) => handleSelect(a, e as unknown as React.MouseEvent<HTMLDivElement>)}
              className={cn(
                "relative cursor-pointer rounded-2xl px-3 py-2.5 transition-colors",
                isSelected || isPlaying ? "bg-cream/90 shadow-sm" : "hover:bg-white/40"
              )}
            >
              <p
                className={cn(
                  "ayah-text text-right text-ink",
                  prefs.fontChoice === "quran" ? "font-quran" : "font-book"
                )}
                style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineHeight }}
              >
                {a.text}{" "}
                <span className="inline-flex align-middle mx-1">
                  <AyahNumber n={a.numberInSurah} size={Math.max(24, prefs.fontSize * 1.05)} />
                </span>
              </p>
              {a.sajda && (
                <span className="absolute left-3 top-2 text-[10px] font-ui text-gold-deep bg-cream rounded-full px-2 py-0.5">
                  ۩ سجدة
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* رقم الصفحة */}
      {prefs.showPageNumber && (
        <p className="text-center text-xs text-muted-foreground mt-4 font-ui">
          الصفحة {toArabicDigits(pageFrom)}
          {pageTo !== pageFrom ? ` — ${toArabicDigits(pageTo)}` : ""}
        </p>
      )}

      {/* زر التمرير التلقائي العائم عند التفعيل */}
      {autoScrolling && (
        <button
          onClick={onToggleAutoScroll}
          className="fixed bottom-40 left-4 z-30 w-12 h-12 rounded-full bg-cream-deep text-ink shadow-lg flex items-center justify-center"
          aria-label="إيقاف التمرير التلقائي"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
        </button>
      )}
    </div>
  );
}
