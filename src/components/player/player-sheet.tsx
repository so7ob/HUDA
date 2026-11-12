"use client";

/**
 * المشغل المصغّر + لوحة المشغل الكاملة
 * مصغّر ثابت فوق شريط التنقل أثناء التشغيل؛
 * اللوحة الكاملة: المقرئ، التكرار، السرعة، تنزيل السورة.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { HudaImg, HUDA_ASSETS } from "@/components/shared/huda-assets";
import { toArabicDigits } from "@/components/shared/ornaments";
import { X, Repeat, Repeat1, Download, Gauge, UserRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
  const player = useAppStore((s) => s.player);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const [expanded, setExpanded] = useState(false);
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs, staleTime: Infinity });
  const { data: recitersData } = useQuery({ queryKey: ["reciters"], queryFn: api.reciters, staleTime: Infinity });

  if (!player.visible || !player.ayahId) return null;
  const surahName = surahsData?.surahs.find((s) => s.number === player.surah)?.name ?? "";

  return (
    <>
      <div className="fixed bottom-[74px] inset-x-0 z-[55] px-3" style={{ paddingBottom: 0 }}>
        <div className="max-w-lg mx-auto bg-white dark:bg-card rounded-2xl shadow-lg border border-border/60 px-3 py-2 flex items-center gap-2 anim-fade-up">
          <button onClick={() => setPlayer({ playing: !player.playing })} className="w-10 h-10 rounded-full bg-header-gradient text-white flex items-center justify-center shrink-0 shadow-sm" aria-label={player.playing ? "إيقاف" : "تشغيل"}>
            {/* رمز تشغيل/إيقاف من أصول «هدى الله» */}
            <HudaImg src={player.playing ? HUDA_ASSETS.player.pause : HUDA_ASSETS.player.play} size={18} className="drop-shadow" />
          </button>
          <button onClick={() => setExpanded(true)} className="flex-1 text-right min-w-0">
            <p className="text-sm font-bold truncate">
              سورة {surahName} — آية {toArabicDigits(player.ayahInSurah)}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {recitersData?.reciters.find((r) => r.id === player.reciterId)?.name ?? ""}
              {player.repeatMode !== "off" ? " · تكرار" : ""}
            </p>
          </button>
          <button
            onClick={() => setPlayer({ playing: false, visible: false, ayahId: null })}
            className="w-9 h-9 flex items-center justify-center text-muted-foreground"
            aria-label="إغلاق المشغل"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <PlayerSheet open={expanded} onOpenChange={setExpanded} />
    </>
  );
}

function PlayerSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const player = useAppStore((s) => s.player);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs, staleTime: Infinity });
  const { data: recitersData } = useQuery({ queryKey: ["reciters"], queryFn: api.reciters, staleTime: Infinity });
  const [downloading, setDownloading] = useState(false);
  const surahName = surahsData?.surahs.find((s) => s.number === player.surah)?.name ?? "";
  const surahCount = surahsData?.surahs.find((s) => s.number === player.surah)?.ayahCount ?? 0;

  const jump = (dir: 1 | -1) => {
    if (!player.ayahId) return;
    const next = player.ayahId + dir;
    const inSurah = player.ayahInSurah + dir;
    if (inSurah >= 1 && inSurah <= surahCount) {
      setPlayer({ ayahId: next, ayahInSurah: inSurah, playing: true });
    }
  };

  const downloadSurah = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // قياس حجم فعلي لآية أولى عبر HEAD (إن سمح CORS) وإلا تقدير معلن
      let sizeBytes = surahCount * 340_000;
      try {
        const tpl = `https://cdn.islamic.network/quran/audio/128/${player.reciterId}/1.mp3`;
        const head = await fetch(tpl, { method: "HEAD" });
        const len = head.headers.get("content-length");
        if (len) sizeBytes = Number(len) * surahCount;
      } catch {
        /* تقدير افتراضي معلن */
      }
      await api.addDownload(player.reciterId, recitersData?.reciters.find((r) => r.id === player.reciterId)?.name ?? "", player.surah, surahName, surahCount, sizeBytes);
      toast.success(`أُضيفت سورة ${surahName} إلى التنزيلات (حجم تقريبي: ${(sizeBytes / 1024 / 1024).toFixed(1)} م.ب)`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto">
        <div className="px-5 pb-8 pt-2">
          <div className="text-center mb-4">
            <DrawerTitle className="sr-only">لوحة التلاوة — سورة {surahName}</DrawerTitle>
            <p className="text-xs text-muted-foreground">يتم تشغيل الآن</p>
            <h3 className="font-bold text-xl" aria-hidden="true">سورة {surahName}</h3>
            <p className="text-sm text-primary font-medium">آية {toArabicDigits(player.ayahInSurah)} من {toArabicDigits(surahCount)}</p>
          </div>

          {/* أزرار التنقل والتشغيل — رموز أصول «هدى الله» */}
          <div className="flex items-center justify-center gap-5 mb-4">
            <button onClick={() => jump(-1)} className="touch-target flex items-center justify-center" aria-label="الآية السابقة">
              <HudaImg src={HUDA_ASSETS.player.prev} size={30} className="brightness-0 opacity-70 dark:brightness-100" />
            </button>
            <button
              onClick={() => setPlayer({ playing: !player.playing })}
              className="w-16 h-16 rounded-full bg-header-gradient text-white shadow-xl flex items-center justify-center active:scale-95 transition"
              aria-label={player.playing ? "إيقاف" : "تشغيل"}
            >
              <HudaImg src={player.playing ? HUDA_ASSETS.player.pause : HUDA_ASSETS.player.play} size={28} className="drop-shadow" />
            </button>
            <button onClick={() => jump(1)} className="touch-target flex items-center justify-center" aria-label="الآية التالية">
              <HudaImg src={HUDA_ASSETS.player.next} size={30} className="brightness-0 opacity-70 dark:brightness-100" />
            </button>
            <button
              onClick={() => {
                setPlayer({ playing: false, visible: false, ayahId: null });
                onOpenChange(false);
              }}
              className="touch-target flex items-center justify-center rounded-full border border-border/70 text-ink/60 hover:bg-accent transition-colors"
              aria-label="إيقاف التلاوة وإغلاق المشغل"
            >
              <HudaImg src={HUDA_ASSETS.player.stop} size={22} className="dark:invert" />
            </button>
          </div>

          {/* التكرار */}
          <div className="flex items-center justify-between bg-muted/60 rounded-2xl px-4 py-3 mb-3">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Repeat size={16} /> التكرار
            </span>
            <div className="flex gap-1.5">
              {(
                [
                  ["off", "بدون"],
                  ["ayah", "الآية ×٣"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === "ayah") {
                      // نطاق: من الآية الحالية حتى نهاية السورة
                      const from = player.ayahId ?? 0;
                      setPlayer({ repeatMode: id, repeatCount: 3, rangeFrom: from, rangeTo: from });
                    } else {
                      setPlayer({ repeatMode: id });
                    }
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    player.repeatMode === id ? "bg-primary text-white" : "bg-white text-muted-foreground"
                  )}
                >
                  {id === "ayah" && <Repeat1 size={12} className="inline mr-1" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* السرعة */}
          <div className="bg-muted/60 rounded-2xl px-4 py-3 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Gauge size={16} /> سرعة التشغيل
              </span>
              <span className="text-xs font-bold text-primary">{player.speed.toFixed(2)}×</span>
            </div>
            <Slider value={[player.speed]} min={0.5} max={2} step={0.05} onValueChange={([v]) => setPlayer({ speed: v })} />
          </div>

          {/* المقرئ */}
          <div className="bg-muted/60 rounded-2xl px-4 py-3 mb-3">
            <span className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <UserRound size={16} /> المقرئ
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(recitersData?.reciters ?? []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setPlayer({ reciterId: r.id })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    player.reciterId === r.id ? "bg-primary text-white" : "bg-white text-muted-foreground"
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* تنزيل */}
          <button
            onClick={downloadSurah}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-accent text-teal-dark rounded-2xl py-3 font-bold text-sm disabled:opacity-60"
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            تنزيل سورة {surahName} للاستماع دون إنترنت
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            في بيئة الويب: التسجيل يُدار عبر ذاكرة المتصفح المؤقتة — في نسخة الجوال تُخزَّن الملفات محليًا كاملة.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
