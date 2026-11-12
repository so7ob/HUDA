"use client";

/**
 * شاشة قارئ القرآن — تُدير الوضعين (قائمة/مصحف)، قائمة الآية،
 * التفسير، خيارات العرض، الانتقال، وبداية/نهاية الورد.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ReaderListMode } from "./reader-list";
import { ReaderMushafMode } from "./reader-mushaf";
import { AyahActionsSheet } from "./ayah-actions";
import { TafsirSheet } from "./tafsir-sheet";
import { DisplaySheet } from "./display-sheet";
import { toArabicDigits } from "@/components/shared/ornaments";
import { ChevronRight, List, BookOpen, Type, ArrowDown, Loader2, MoveVertical, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeArabic } from "@/lib/arabic";

export function ReaderScreen({
  surah: initialSurah,
  ayah: initialAyah,
  page: initialPage,
  onClose,
}: {
  surah: number;
  ayah?: number;
  page?: number;
  onClose: () => void;
}) {
  const { readerPrefs: prefs, setReaderPrefs, setPlayer, player, openOverlay } = useAppStore();
  const [surahNumber, setSurahNumber] = useState(initialSurah);
  const [pageOverride, setPageOverride] = useState<number | null>(initialPage ?? null);
  const [targetAyah, setTargetAyah] = useState<number | undefined>(initialAyah);
  const [selected, setSelected] = useState<{ id: number; surah: number; numberInSurah: number; text: string } | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoValue, setGotoValue] = useState("");
  const [autoScroll, setAutoScroll] = useState(false);
  // تحديد ورد: بداية/نهاية
  const [wirdStart, setWirdStart] = useState<{ id: number; surah: number; numberInSurah: number; label: string } | null>(null);
  const [wirdEnd, setWirdEnd] = useState<{ id: number; surah: number; numberInSurah: number; label: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["surah", surahNumber],
    queryFn: () => api.surah(surahNumber),
  });

  // في وضع المصحف قد يكون التحديد من سورة غير المفتوحة — نجلب بياناتها
  const selectedSurahNumber = selected?.surah ?? surahNumber;
  const { data: selectedSurahData } = useQuery({
    queryKey: ["surah", selectedSurahNumber],
    queryFn: () => api.surah(selectedSurahNumber),
    enabled: prefs.mode === "mushaf" && selectedSurahNumber !== surahNumber,
    staleTime: Infinity,
  });
  const effectiveSurahData = prefs.mode === "mushaf" && selected ? selectedSurahData ?? data : data;
  const selectedAyahText =
    effectiveSurahData?.ayahs.find((a) => a.id === selected?.id)?.text ?? selected?.text ?? "";

  // حفظ آخر قراءة (تفعيلي عند الفتح وكل تغيير موضع)
  const saveLast = useCallback(
    (s: number, a: number, p: number, mode: string) => {
      api.saveLastReading(s, a, p, mode).catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    if (data) {
      const firstAyah = targetAyah ?? 1;
      const ayahRow = data.ayahs.find((x) => x.numberInSurah === firstAyah);
      saveLast(surahNumber, firstAyah, ayahRow?.page ?? data.surah.startPage, prefs.mode);
    }
  }, [surahNumber, targetAyah, data, prefs.mode, saveLast]);

  // عند فتح بوضع مصحف بدون صفحة محددة: اشتقاق الصفحة من بيانات الآية (بدون effect)
  const derivedPage =
    pageOverride ??
    (prefs.mode === "mushaf" && data
      ? data.ayahs.find((x) => x.numberInSurah === (targetAyah ?? 1))?.page ?? 1
      : 1);
  const page = derivedPage;
  const setPage = setPageOverride;

  // التمرير إلى الآية الهدف عند التحميل (مرة واحدة لكل قيمة هدف)
  const handledTargetRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (data && targetAyah && prefs.mode === "list" && handledTargetRef.current !== targetAyah) {
      handledTargetRef.current = targetAyah;
      const row = data.ayahs.find((a) => a.numberInSurah === targetAyah);
      if (row) {
        const id = setTimeout(() => {
          document.getElementById(`ayah-${row.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 350);
        return () => clearTimeout(id);
      }
    }
  }, [data, targetAyah, prefs.mode]);

  const playingAyahId = player.playing ? player.ayahId : null;

  const handleSelectAyah = useCallback(
    (a: { id: number; surah: number; numberInSurah: number; text: string }, _el?: HTMLElement) => {
      setSelected(a);
      setActionsOpen(true);
    },
    []
  );

  const handleMushafSelect = useCallback(
    (surah: number, numberInSurah: number, id: number) => {
      const text = data?.ayahs.find((x) => x.id === id)?.text ?? "";
      setSelected({ id, surah, numberInSurah, text });
      setActionsOpen(true);
    },
    [data]
  );

  const surahMeta = effectiveSurahData?.surah;
  const title = prefs.mode === "mushaf" ? `المصحف — ${toArabicDigits(page || 1)}` : `سورة ${surahMeta?.name ?? ""}`;

  const onToggleAutoScroll = () => setAutoScroll((v) => !v);

  // بداية/نهاية ورد
  const createWird = () => {
    if (!wirdStart || !wirdEnd) return;
    openOverlay({
      kind: "planEditor",
      prefill: {
        name: `ورد قرآني: ${wirdStart.label} — ${wirdEnd.label}`,
        targetType: "quran_range",
        targetRef: JSON.stringify({
          fromSurah: wirdStart.surah,
          fromAyah: wirdStart.numberInSurah,
          toSurah: wirdEnd.surah,
          toAyah: wirdEnd.numberInSurah,
        }),
        kind: "wird",
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label="قارئ القرآن">
      {/* الشريط العلوي */}
      <div className="sticky top-0 z-20 bg-header-gradient header-pattern overflow-hidden text-white shadow-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-lg mx-auto px-3 h-14 flex items-center justify-between">
          <button onClick={onClose} className="touch-target flex items-center justify-center rounded-full hover:bg-white/10" aria-label="رجوع">
            <ChevronRight size={26} />
          </button>
          <h1 className="font-bold text-lg truncate px-2">{title}</h1>
          <div className="flex items-center">
            <button
              onClick={onToggleAutoScroll}
              className={cn("touch-target flex items-center justify-center rounded-full hover:bg-white/10", autoScroll && "bg-white/20")}
              aria-label="التمرير التلقائي"
              title="التمرير التلقائي"
            >
              <MoveVertical size={21} />
            </button>
            <button
              onClick={() => setDisplayOpen(true)}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10"
              aria-label="كيفية العرض"
              title="كيفية العرض"
            >
              <Type size={21} />
            </button>
            <button
              onClick={() => setGotoOpen(true)}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10"
              aria-label="الانتقال"
              title="الانتقال إلى آية/صفحة"
            >
              <ArrowDown size={21} />
            </button>
          </div>
        </div>
        {/* مبدّل الوضع */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex justify-center">
          <div className="bg-white/15 backdrop-blur rounded-full p-0.5 flex text-sm">
            {(
              [
                ["list", "قائمة", List],
                ["mushaf", "مصحف", BookOpen],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setReaderPrefs({ mode: id })}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-5 py-1.5 transition-all",
                  prefs.mode === id ? "bg-white text-teal-dark font-bold" : "text-white/85"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-lg mx-auto px-3 pb-36 pt-4">
        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {!isLoading && prefs.mode === "list" && data && (
          <ReaderListMode
            surahName={data.surah.name}
            surahNumber={surahNumber}
            ayahs={data.ayahs}
            selectedAyahId={selected?.id ?? null}
            playingAyahId={playingAyahId}
            onSelectAyah={(a) => handleSelectAyah(a)}
            pageFrom={data.ayahs[0]?.page ?? 1}
            pageTo={data.ayahs[data.ayahs.length - 1]?.page ?? 1}
            autoScrolling={autoScroll}
            onToggleAutoScroll={onToggleAutoScroll}
            aufScrollSpeed={prefs.autoScrollSpeed}
          />
        )}

        {!isLoading && prefs.mode === "mushaf" && page > 0 && (
          <ReaderMushafMode
            page={page}
            onPageChange={(p) => {
              setPage(p);
              const s = data;
              if (s) {
                // حفظ آخر قراءة عند تغيير الصفحة
                api.saveLastReading(surahNumber, 1, p, "mushaf").catch(() => undefined);
              }
            }}
            playingAyahId={playingAyahId}
            selectedAyahId={selected?.id ?? null}
            onSelectAyah={handleMushafSelect}
          />
        )}

        {prefs.mode === "mushaf" && page === 0 && data && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {/* شريط إنشاء الورد من التحديد */}
        {wirdStart && wirdEnd && (
          <button
            onClick={createWird}
            className="fixed bottom-36 inset-x-6 max-w-md mx-auto z-30 bg-primary text-white rounded-2xl py-3 shadow-xl flex items-center justify-center gap-2 anim-fade-up"
          >
            إنشاء ورد من {wirdStart.label} إلى {wirdEnd.label}
            <X size={16} onClick={(e) => { e.stopPropagation(); setWirdStart(null); setWirdEnd(null); }} />
          </button>
        )}
      </div>

      {/* زر التلاوة العائم — يخفى عند ظهور المشغل المصغّر */}
      {!player.visible && (
        <button
          onClick={() => {
            if (!data) return;
            if (player.playing) {
              setPlayer({ playing: false });
            } else {
              const start = data.ayahs.find((a) => a.numberInSurah === 1) ?? data.ayahs[0];
              setPlayer({
                playing: true,
                ayahId: start.id,
                surah: surahNumber,
                ayahInSurah: start.numberInSurah,
                visible: true,
                repeatMode: "off",
              });
            }
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 w-16 h-16 rounded-full bg-header-gradient text-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
          aria-label={player.playing ? "إيقاف التلاوة" : "تشغيل تلاوة السورة"}
        >
          {player.playing ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
          )}
        </button>
      )}

      {/* الأوراق السفلية */}
      <AyahActionsSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        ayah={selected ? { ...selected, text: selectedAyahText } : null}
        surahName={surahMeta?.name}
        onPlayAyah={() => {
          if (!selected) return;
          setPlayer({
            playing: true,
            ayahId: selected.id,
            surah: selected.surah,
            ayahInSurah: selected.numberInSurah,
            visible: true,
          });
        }}
        onShowTafsir={() => {
          setActionsOpen(false);
          setTafsirOpen(true);
        }}
        onCopy={() => {
          if (!selected) return;
          navigator.clipboard.writeText(`${selectedAyahText}\n(${toArabicDigits(selected.surah)}:${toArabicDigits(selected.numberInSurah)}) — سورة ${surahMeta?.name}`).then(() => toast.success("تم نسخ الآية"));
        }}
        onShare={async () => {
          if (!selected) return;
          const text = `${selectedAyahText}\nسورة ${surahMeta?.name} — الآية ${toArabicDigits(selected.numberInSurah)}\n— من تطبيق نور الهدى`;
          if (navigator.share) {
            try {
              await navigator.share({ title: "آية من نور الهدى", text });
            } catch {
              /* أُلغيت المشاركة */
            }
          } else {
            navigator.clipboard.writeText(text);
            toast.success("نُسخ نص المشاركة");
          }
        }}
        wirdStart={wirdStart}
        wirdEnd={wirdEnd}
        setWirdStart={setWirdStart}
        setWirdEnd={setWirdEnd}
      />

      <TafsirSheet
        open={tafsirOpen}
        onOpenChange={setTafsirOpen}
        ayah={selected ? { ...selected, text: selectedAyahText } : null}
        surahName={surahMeta?.name ?? ""}
        onNavigate={(dir) => {
          if (!selected || !effectiveSurahData) return;
          const idx = effectiveSurahData.ayahs.findIndex((a) => a.id === selected.id);
          const next = effectiveSurahData.ayahs[idx + dir];
          if (next) setSelected(next);
        }}
      />

      <DisplaySheet open={displayOpen} onOpenChange={setDisplayOpen} />

      {/* الانتقال إلى آية/صفحة */}
      {gotoOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-6" onClick={() => setGotoOpen(false)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">الانتقال إلى</h3>
            <input
              value={gotoValue}
              onChange={(e) => setGotoValue(e.target.value)}
              placeholder={prefs.mode === "mushaf" ? "رقم الصفحة (1-604)" : "رقم الآية"}
              inputMode="numeric"
              className="w-full border border-border rounded-xl px-4 py-2.5 mb-3 text-center text-lg"
              autoFocus
            />
            <button
              onClick={() => {
                const n = parseInt(normalizeArabic(gotoValue).replace(/[^\d]/g, ""), 10);
                if (Number.isNaN(n)) return;
                if (prefs.mode === "mushaf") {
                  if (n >= 1 && n <= 604) {
                    setPage(n);
                    setGotoOpen(false);
                    setGotoValue("");
                  }
                } else if (data && n >= 1 && n <= data.surah.ayahCount) {
                  const row = data.ayahs.find((a) => a.numberInSurah === n);
                  if (row) {
                    setSelected(row);
                    setTargetAyah(n);
                    document.getElementById(`ayah-${row.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                  setGotoOpen(false);
                  setGotoValue("");
                } else {
                  toast.error("الرقم خارج النطاق");
                }
              }}
              className="w-full bg-primary text-white rounded-xl py-2.5 font-bold"
            >
              انتقل
            </button>
            {prefs.mode === "list" && (
              <button
                onClick={() => {
                  setReaderPrefs({ mode: "mushaf" });
                  const row = data?.ayahs.find((a) => a.id === selected?.id);
                  if (row) setPage(row.page);
                  setGotoOpen(false);
                }}
                className="w-full mt-2 text-primary py-2 text-sm"
              >
                الانتقال لصفحة هذه الآية في المصحف
              </button>
            )}
            <button onClick={() => setGotoOpen(false)} className="w-full py-2 text-muted-foreground text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


