"use client";

/**
 * شاشة آيات الموضوع (overlay) — آيات الفهرس الموضوعي بخط مصحفي،
 * مع ملاحظات المراجع والإحالة ومفضلة سريعة لكل آية.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toArabicDigits, Flourish } from "@/components/shared/ornaments";
import { ChevronRight, Heart, Loader2, ScrollText, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TopicAyahsScreen({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const { openOverlay } = useAppStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["topic", topicId], queryFn: () => api.topic(topicId) });
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs });
  const { data: favsData } = useQuery({ queryKey: ["favorites"], queryFn: api.favorites });

  const topic = data?.topic;

  const surahNameMap = useMemo(
    () => new Map((surahsData?.surahs ?? []).map((s) => [s.number, s.name] as const)),
    [surahsData]
  );

  /* الرقم العالمي لآية (سورة، رقمها) عبر الخريطة التراكمية لأعداد الآيات */
  const globalAyahId = useMemo(() => {
    const cumMap = new Map<number, number>();
    let cum = 0;
    for (const s of surahsData?.surahs ?? []) {
      cumMap.set(s.number, cum);
      cum += s.ayahCount;
    }
    return (surah: number, ayah: number) => (cumMap.get(surah) ?? 0) + ayah;
  }, [surahsData]);

  const favRefKeys = useMemo(
    () => new Set((favsData?.favorites ?? []).filter((f) => f.kind === "ayah").map((f) => f.refKey)),
    [favsData]
  );

  const toggleFav = useMutation({
    mutationFn: async (p: { surah: number; ayah: number; text?: string }) => {
      const refKey = `ayah:${globalAyahId(p.surah, p.ayah)}`;
      const surahName = surahNameMap.get(p.surah) ?? "";
      const label = `سورة ${surahName} — آية ${toArabicDigits(p.ayah)}`;
      if (favRefKeys.has(refKey)) await api.removeFavorite("ayah", refKey);
      else await api.addFavorite("ayah", refKey, label, p.text?.slice(0, 140));
    },
    onSuccess: (_res, p) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      const wasFav = favRefKeys.has(`ayah:${globalAyahId(p.surah, p.ayah)}`);
      toast.success(wasFav ? "أُزيلت الآية من المفضلة" : "حُفظت الآية في المفضلة");
    },
    onError: () => toast.error("تعذّر تنفيذ العملية، حاول مجددًا"),
  });

  const openAyah = (surah: number, ayah: number) => {
    openOverlay({ kind: "reader", surah, ayah });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label={`آيات موضوع ${topic?.title ?? ""}`}>
      {/* ✦ الترويسة اللاصقة ✦ */}
      <div className="sticky top-0 z-20 bg-header-gradient text-white shadow-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-lg mx-auto px-3 h-14 flex items-center">
          <button
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={26} />
          </button>
          <h1 className="font-bold text-lg flex-1 truncate px-1 text-center">{topic?.title ?? "موضوع"}</h1>
          <span className="w-11 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28 pt-4">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
          </div>
        )}

        {!isLoading && !topic && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <ScrollText size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">الموضوع غير متوفر</p>
            <p className="text-sm text-muted-foreground">ربما أُزيل أو لم يُنشر بعد.</p>
          </div>
        )}

        {topic && (
          <div className="anim-fade-up">
            {topic.description && (
              <p className="text-center text-sm leading-relaxed text-muted-foreground bg-secondary/70 rounded-2xl px-4 py-3 mb-5">
                {topic.description}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 mb-5">
              <Flourish className="w-12 text-gold-deep/60" flip />
              <span className="text-xs font-bold text-gold-deep font-ui">
                {toArabicDigits(topic.ayahCount)} آية
              </span>
              <Flourish className="w-12 text-gold-deep/60" />
            </div>

            <div className="space-y-4">
              {(topic.ayahs ?? []).map((a) => {
                const refKey = `ayah:${globalAyahId(a.surah, a.ayah)}`;
                const isFav = favRefKeys.has(refKey);
                const surahName = surahNameMap.get(a.surah) ?? "";
                return (
                  <div key={`${a.surah}:${a.ayah}`} className="bg-reading-gradient rounded-2xl p-4 card-soft">
                    <button
                      onClick={() => openAyah(a.surah, a.ayah)}
                      className="w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                      aria-label={`فتح الآية في سورة ${surahName}`}
                    >
                      <p className="font-quran text-[21px] leading-[2.1] text-ink">{a.text ?? "…"}</p>
                      {a.note && (
                        <div className="mt-3 flex items-start gap-2 bg-cream rounded-xl px-3 py-2">
                          <StickyNote size={15} className="text-gold-deep shrink-0 mt-1" aria-hidden="true" />
                          <p className="text-xs leading-relaxed text-ink/75 font-ui">{a.note}</p>
                        </div>
                      )}
                    </button>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openAyah(a.surah, a.ayah)}
                        className="text-xs font-ui font-bold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {surahName ? `سورة ${surahName}` : "السورة"} — آية {toArabicDigits(a.ayah)}
                      </button>
                      <button
                        onClick={() => toggleFav.mutate({ surah: a.surah, ayah: a.ayah, text: a.text })}
                        disabled={toggleFav.isPending}
                        className={cn(
                          "w-11 h-11 flex items-center justify-center rounded-full transition-colors",
                          isFav ? "text-rose-500 hover:bg-rose-500/10" : "text-muted-foreground hover:text-rose-500 hover:bg-accent"
                        )}
                        aria-label={isFav ? "إزالة الآية من المفضلة" : "إضافة الآية إلى المفضلة"}
                        aria-pressed={isFav}
                      >
                        <Heart size={18} className={isFav ? "fill-current" : ""} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
