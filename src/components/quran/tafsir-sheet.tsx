"use client";

/**
 * ورقة التفسير — تفسير الآية المحددة مع المصدر والتنقل بين الآيات
 */
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { ChevronRight, ChevronLeft, Copy, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ayah: { id: number; surah: number; numberInSurah: number; text: string } | null;
  surahName: string;
  onNavigate: (dir: 1 | -1) => void;
}

export function TafsirSheet({ open, onOpenChange, ayah, surahName, onNavigate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["tafsir", ayah?.surah, ayah?.numberInSurah],
    queryFn: () => api.tafsir(ayah!.surah, ayah!.numberInSurah),
    enabled: open && !!ayah,
  });
  const setPlayer = useAppStore((s) => s.setPlayer);
  if (!ayah) return null;

  const saveTafsirFav = async () => {
    if (!data) return;
    await api.addFavorite("tafsir", `tafsir:${ayah.surah}:${ayah.numberInSurah}`, `تفسير آية ${toArabicDigits(ayah.numberInSurah)} — سورة ${surahName}`, data.text.slice(0, 140));
    toast.success("أُضيف التفسير إلى المفضلة");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader className="pb-1">
          <DrawerTitle className="text-center font-bold">
            التفسير — سورة {surahName}، آية {toArabicDigits(ayah.numberInSurah)}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-5 pb-6 max-h-[60vh] overflow-y-auto nice-scrollbar">
          <p className="font-quran text-lg text-right leading-loose text-ink/85 bg-reading rounded-2xl p-3 mb-3">
            {ayah.text}
          </p>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <>
              <p className="font-book text-[1.05rem] leading-[2] text-ink/90 text-right">{data?.text}</p>
              <div className="mt-4 rounded-xl bg-muted/70 p-3 text-xs text-muted-foreground leading-relaxed">
                <span className="font-bold text-ink/70">المصدر: </span>
                {data?.source.name} — {data?.source.author}
                <br />
                {data?.source.source}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between px-5 pb-8 pt-2">
          <button onClick={() => onNavigate(-1)} className="touch-target flex items-center gap-1 text-primary text-sm font-medium">
            <ChevronRight size={18} /> الآية السابقة
          </button>
          <div className="flex gap-1">
            <button onClick={() => { navigator.clipboard.writeText(data?.text ?? ""); toast.success("نُسخ التفسير مع الإحالة"); }} className="touch-target flex items-center justify-center text-muted-foreground" aria-label="نسخ">
              <Copy size={19} />
            </button>
            <button onClick={saveTafsirFav} className="touch-target flex items-center justify-center text-muted-foreground" aria-label="مفضلة">
              <Heart size={19} />
            </button>
            <button
              onClick={() => {
                setPlayer({ playing: true, ayahId: ayah.id, surah: ayah.surah, ayahInSurah: ayah.numberInSurah, visible: true });
              }}
              className="touch-target flex items-center justify-center text-muted-foreground"
              aria-label="تشغيل الآية"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
            </button>
          </div>
          <button onClick={() => onNavigate(1)} className="touch-target flex items-center gap-1 text-primary text-sm font-medium">
            الآية التالية <ChevronLeft size={18} />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
