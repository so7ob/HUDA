"use client";

/**
 * وضع المصحف — عرض صفحات المصحف المدني (604 صفحة) بالخط المرخص QCF
 * الرسم مطابق لمصحف المدينة: 15 سطرًا لكل صفحة، صناديق السور والبسملة
 * بخط الترويسة المرخص، تنقل بالسحب والأزرار، حفظ الصفحة، تظليل الآية.
 * ملاحظة توثيقية: النص الرسومي مستورد من قاعدة بيانات موثقة (هدى/QCF)
 * ولا يُعدَّل إطلاقًا — العرض فقط.
 */
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { useAppStore } from "@/lib/store";
import { MushafPage, type MushafSlot } from "./mushaf-page";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

interface MushafModeProps {
  page: number;
  onPageChange: (p: number) => void;
  playingAyahId: number | null;
  selectedAyahId: number | null;
  onSelectAyah: (surah: number, ayahInSurah: number, ayahId: number) => void;
}

interface MushafResponse {
  page: number;
  juz: number;
  hizbQuarter: number;
  slots: MushafSlot[];
  surahs: { number: number; name: string; nameFull: string; ayahCount: number; revelationType: string }[];
}

export function ReaderMushafMode({ page, onPageChange, playingAyahId, selectedAyahId, onSelectAyah }: MushafModeProps) {
  const prefs = useAppStore((s) => s.readerPrefs);
  const touchStartX = useRef<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mushaf-page", page],
    queryFn: () => api.pageMushaf(page),
    placeholderData: (prev) => prev,
    staleTime: Infinity,
  });
  const mushaf = data as MushafResponse | undefined;

  const juz = mushaf?.juz ?? 1;
  const surahNames = (mushaf?.surahs ?? []).map((s) => s.name).join(" · ");

  const go = (dir: 1 | -1) => {
    const next = page + dir;
    if (next >= 1 && next <= 604) onPageChange(next);
  };

  // التنقل بالسحب (RTL: سحب لليسار = الصفحة التالية)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      go(dx < 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  return (
    <div className="px-1 pb-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* شريط معلومات + تنقل */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => go(-1)}
          disabled={page === 1}
          className="touch-target flex items-center justify-center rounded-full bg-accent text-primary disabled:opacity-30 active:scale-95 transition"
          aria-label="الصفحة السابقة"
        >
          <ChevronRight size={22} />
        </button>
        <div className="text-center min-w-0">
          <p className="text-sm font-bold text-ink/85 truncate">{surahNames || "المصحف الشريف"}</p>
          <p className="text-xs text-muted-foreground">
            الجزء {toArabicDigits(juz)} — صفحة {toArabicDigits(page)} من {toArabicDigits(604)}
          </p>
        </div>
        <button
          onClick={() => go(1)}
          disabled={page === 604}
          className="touch-target flex items-center justify-center rounded-full bg-accent text-primary disabled:opacity-30 active:scale-95 transition"
          aria-label="الصفحة التالية"
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      {/* الصفحة بلمسة الرسم المدني */}
      {isLoading && !mushaf && (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-primary" size={30} />
        </div>
      )}

      {isError && (
        <p className="text-center text-muted-foreground py-16">تعذر تحميل بيانات الصفحة — تحقق من الاتصال وأعد المحاولة</p>
      )}

      {mushaf && mushaf.slots.length > 0 && (
        <MushafPage
          page={page}
          slots={mushaf.slots}
          selectedAyahId={selectedAyahId}
          playingAyahId={playingAyahId}
          onSelectAyah={onSelectAyah}
          brightness={prefs.brightness}
        />
      )}

      {!isLoading && mushaf && mushaf.slots.length === 0 && (
        <p className="text-center text-muted-foreground py-16">لا توجد بيانات لهذه الصفحة</p>
      )}

      {/* مؤشر التقدم في المصحف */}
      <div className="mt-3 px-6">
        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(page / 604) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
