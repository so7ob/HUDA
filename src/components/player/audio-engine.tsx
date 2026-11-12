"use client";

/**
 * محرك التلاوات — يعمل عبر التطبيق كله (يُركَّب مرة واحدة)
 * ============================================================
 * المصدر: cdn.islamic.network (everyayah) — ملف MP3 لكل آية،
 * ما يعني أن التظليل المرتبط بالآية الجارية دقيق بنيويًا
 * (كل آية ملف مستقل — لا حاجة لبيانات توقيت خارجية).
 *
 * - تشغيل/إيقاف، تقدم تلقائي للآية التالية
 * - تكرار الآية أو نطاق آيات
 * - سرعة التشغيل
 * - تحديث حالة المتجر لعرض التظليل والمشغل المصغّر
 * - المخزن المحلي أولًا (Issue #9): الآيات المنزّلة تُشغَّل من
 *   IndexedDB عبر blob: — تعمل دون أي شبكة.
 */
import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getPlaybackUrl, DEFAULT_AUDIO_TEMPLATE } from "@/lib/audio-store";
import { toast } from "sonner";

export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatLeftRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);

  const { data: recitersData } = useQuery({ queryKey: ["reciters"], queryFn: api.reciters, staleTime: Infinity });
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs, staleTime: Infinity });

  const player = useAppStore((s) => s.player);
  const setPlayer = useAppStore((s) => s.setPlayer);

  const templates = new Map((recitersData?.reciters ?? []).map((r) => [r.id, r.audioUrlTemplate]));
  const surahs = surahsData?.surahs ?? [];

  /** تحويل الرقم العالمي للآية إلى (سورة، رقم ضمن السورة) — خرائط تراكمية محلية */
  const locate = (ayahId: number): { surah: number; numberInSurah: number } | null => {
    let cum = 0;
    for (const s of surahs) {
      if (ayahId <= cum + s.ayahCount) {
        return { surah: s.number, numberInSurah: ayahId - cum };
      }
      cum += s.ayahCount;
    }
    return null;
  };

  // إنشاء عنصر الصوت مرة واحدة
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    // خطاف فحص للبيئة التطويرية فقط (فحوص المتصفح الآلية) — يكشف عنصر الصوت
    // لأنه غير مُلحق بالـ DOM، ولا يُشغَّل في الإنتاج.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __hudaAudio?: HTMLAudioElement }).__hudaAudio = audio;
    }
    return () => {
      audio.pause();
      audio.src = "";
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as { __hudaAudio?: HTMLAudioElement }).__hudaAudio;
      }
    };
  }, []);

  // تغيير السرعة
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = player.speed;
  }, [player.speed]);

  // تحميل وتشغيل الآية عند تغيير الحالة — المخزن المحلي أولًا ثم الشبكة
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!player.playing || !player.ayahId) {
      audio.pause();
      return;
    }
    // الالتقاط المبكر لمنع سباقات تغيّر الحالة أثناء قراءة المخزن غير المتزامنة
    const ayahId = player.ayahId;
    const reciterId = player.reciterId;
    let cancelled = false;

    void (async () => {
      // 1) المخزن المحلي أولاً — السور المنزّلة تعمل دون شبكة (Issue #9)
      const localUrl = await getPlaybackUrl(reciterId, ayahId);
      if (cancelled) {
        if (localUrl) URL.revokeObjectURL(localUrl);
        return;
      }
      // 2) الشبكة عبر قالب المقرئ (سلوك سابق محفوظ)
      const tpl = templates.get(reciterId) ?? DEFAULT_AUDIO_TEMPLATE;
      // دعم العنصرين النائبين {ayah} و {ayahId} — كلاهما الرقم العالمي للآية
      const networkUrl = tpl
        .replace("{ayahId}", String(ayahId))
        .replace("{ayah}", String(ayahId));

      if (localUrl) {
        if (blobUrlRef.current && blobUrlRef.current !== localUrl) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = localUrl;
      }
      const fullUrl = localUrl ?? networkUrl;
      if (audio.src !== fullUrl) {
        audio.src = fullUrl;
      }
      audio.playbackRate = player.speed;
      audio.play().catch(() => {
        // قد يرفض المتصفح التشغيل التلقائي — نوقف الحالة
        setPlayer({ playing: false });
        toast.error("تعذر تشغيل الصوت — جرّب مجددًا");
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [player.playing, player.ayahId, player.reciterId]);

  // معالجة انتهاء الآية
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (!player.ayahId) return;
      const cur = locate(player.ayahId);
      if (!cur) {
        setPlayer({ playing: false });
        return;
      }
      // تكرار الآية
      if (player.repeatMode === "ayah") {
        if (repeatLeftRef.current > 1) {
          repeatLeftRef.current -= 1;
          audio.currentTime = 0;
          audio.play().catch(() => undefined);
          return;
        }
        repeatLeftRef.current = player.repeatCount;
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
        return;
      }
      // تكرار نطاق
      if (player.repeatMode === "range" && player.rangeFrom && player.rangeTo) {
        const nextId = player.ayahId + 1;
        const next = nextId <= player.rangeTo ? nextId : player.rangeFrom;
        const loc = locate(next);
        setPlayer({ ayahId: next, ...(loc ? { surah: loc.surah, ayahInSurah: loc.numberInSurah } : {}) });
        return;
      }
      // تقدم عادي إلى نهاية السورة ثم التوقف
      const surah = surahs.find((s) => s.number === cur.surah);
      if (surah && cur.numberInSurah < surah.ayahCount) {
        setPlayer({ ayahId: player.ayahId + 1, ayahInSurah: cur.numberInSurah + 1 });
      } else {
        setPlayer({ playing: false });
        toast.success("اكتملت تلاوة السورة");
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [player, setPlayer, surahs]);

  // مزامنة عداد التكرار عند التفعيل
  useEffect(() => {
    if (player.repeatMode === "ayah") repeatLeftRef.current = player.repeatCount;
  }, [player.repeatMode, player.repeatCount]);

  return null;
}
