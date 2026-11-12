"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { HudaImg, HUDA_ASSETS } from "@/components/shared/huda-assets";
import { toArabicDigits } from "@/components/shared/ornaments";
import { Search, Settings, Menu, Bookmark, ChevronLeft, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

/** زخرفة رأس السورة في القائمة (نجمة ثمانية أصلية) */
function SurahOrnamentIcon() {
  return (
    <svg viewBox="0 0 44 44" width="44" height="44" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M22 3l4.6 4.9L33 6l1.2 6.7L41 15l-2.6 6.3L41 28l-6.8 2.2L33 37l-6.4-1.9L22 40l-4.6-4.9L11 37l-1.2-6.7L3 28l2.6-6.7L3 15l6.8-2.3L11 6l6.4 1.9L22 3Z" stroke="var(--huda-gold-deep)" strokeWidth="1.3" fill="color-mix(in srgb, var(--huda-cream) 80%, white)" />
      <path d="M15 22c3-4 11-4 14 0c-3 4-11 4-14 0Z" fill="var(--huda-teal-dark)" />
      <circle cx="22" cy="22" r="2.4" fill="var(--huda-cream)" />
    </svg>
  );
}

export function QuranHome() {
  const { openOverlay, setTab } = useAppStore();
  const [indexTab, setIndexTab] = useState<"index" | "topics">("index");
  const [subTab, setSubTab] = useState<"surah" | "juz" | "page">("surah");
  const [juzPage, setJuzPage] = useState(1);

  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs });
  const { data: lastData } = useQuery({ queryKey: ["last-reading"], queryFn: api.lastReading });
  const { data: topicsData } = useQuery({ queryKey: ["topics"], queryFn: api.topics });
  const { data: juzData } = useQuery({ queryKey: ["juz", juzPage], queryFn: () => api.juz(juzPage) });

  const last = lastData?.last;
  const surahs = surahsData?.surahs ?? [];
  const topics = topicsData?.topics ?? [];

  // نسبة التقدم الفعلية: من الصفحة الحالية إلى 604
  const progressPct = last ? Math.min(100, Math.round(((last.page - 1) / 604) * 100)) : 0;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "طاب يومك";
    return "مساء الخير";
  }, []);

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* ✦ الترويسة الفيروزية ✦ */}
      <header className="bg-header-gradient header-pattern text-white rounded-b-[28px] pb-8 shadow-md overflow-hidden">
        <div className="max-w-lg mx-auto px-4 pt-3 relative">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setTab("settings")}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="الإعدادات"
            >
              <Settings size={24} strokeWidth={1.8} />
            </button>
            <h1 className="font-ui font-bold text-xl tracking-tight">القرآن الكريم</h1>
            <button
              onClick={() => openOverlay({ kind: "favorites" })}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="القائمة"
            >
              <Menu size={24} strokeWidth={1.8} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {/* شعار «هدى الله» من أصول المصدر المفتوح */}
            <HudaImg src={HUDA_ASSETS.logo} size={52} className="rounded-2xl shadow-md ring-1 ring-white/30 shrink-0" alt="شعار نور الهدى" />
            <p className="flex-1 text-right font-medium leading-snug">
              السلام عليكم
              <br />
              <span className="text-lg">{useAppStore.getState().userName}</span>
            </p>
          </div>

          {/* ✦ بطاقة آخر قراءة ✦ */}
          {last && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openOverlay({ kind: "reader", surah: last.surah, ayah: last.ayah, page: last.page })}
              className="mt-4 w-full text-right rounded-3xl overflow-hidden relative shadow-lg active:scale-[0.99] transition-transform"
            >
              <div className="absolute inset-0 bg-cover-gradient night" aria-hidden="true">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(185,153,95,0.35) 0, transparent 45%)" }} />
              </div>
              <div className="relative p-4 flex items-center gap-3">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="1.8" className="shrink-0 drop-shadow">
                  <path d="M4 5.5C6.5 4.2 9 4.2 12 6c3-1.8 5.5-1.8 8-.5V18c-3-1.3-5.5-1.3-8 .5c-3-1.8-5.5-1.8-8-.5V5.5Z" strokeLinejoin="round" />
                  <path d="M12 6v12.5" strokeLinecap="round" />
                </svg>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-bold text-lg">آخر قراءة</h3>
                    <ChevronLeft size={18} className="opacity-70" />
                  </div>
                  <p className="text-sm opacity-90 mt-0.5">
                    سورة {last.surahName || ""} — آية {toArabicDigits(last.ayah)}
                  </p>
                  <p className="text-xs opacity-70 mt-0.5">الصفحة {toArabicDigits(last.page)}</p>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold">{toArabicDigits(progressPct)}٪</span>
                </div>
              </div>
              <div className="relative px-4 pb-4">
                <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(progressPct, 2)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs opacity-85">
                  <span>المتابعة من حيث توقفت</span>
                  <Play size={14} />
                </div>
              </div>
            </motion.button>
          )}

          {/* ✦ البحث ✦ */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => openOverlay({ kind: "search" })}
              className="flex-1 flex items-center gap-2 bg-white/95 text-ink/60 rounded-full px-5 py-3 shadow-sm active:scale-[0.99] transition-transform"
            >
              <Search size={20} className="text-primary" />
              <span className="text-sm">ابحث عن آية أو سورة أو موضوع…</span>
            </button>
            <button
              onClick={() => openOverlay({ kind: "favorites" })}
              className="touch-target flex items-center justify-center text-white/90 hover:text-white"
              aria-label="المفضلة"
            >
              <Bookmark size={24} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      {/* ✦ اللوحة البيضاء: الفهرس ✦ */}
      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-t-[28px] pt-4 shadow-[0_-6px_24px_rgba(23,90,94,0.08)]">
          <div className="bg-secondary rounded-full p-1 flex mx-2">
            {(
              [
                ["index", "الفهرس"],
                ["topics", "الفهرس الموضوعي"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setIndexTab(id)}
                className={cn(
                  "flex-1 rounded-full py-2.5 text-sm font-bold transition-all",
                  indexTab === id ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {indexTab === "index" ? (
            <>
              <div className="flex mt-4 px-2 border-b border-border/70">
                {(
                  [
                    ["surah", "سورة"],
                    ["juz", "جزء"],
                    ["page", "صفحة"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSubTab(id)}
                    className={cn(
                      "flex-1 pb-2.5 text-sm font-medium relative transition-colors",
                      subTab === id ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {label}
                    {subTab === id && <span className="absolute bottom-0 inset-x-4 h-[3px] rounded-full bg-primary" />}
                  </button>
                ))}
              </div>

              <div className="max-h-[52vh] overflow-y-auto nice-scrollbar px-2 py-3 space-y-2.5">
                {subTab === "surah" &&
                  surahs.map((s) => (
                    <button
                      key={s.number}
                      onClick={() => openOverlay({ kind: "reader", surah: s.number, ayah: 1, page: s.startPage })}
                      className="w-full flex items-center gap-3 bg-card-bg/80 hover:bg-accent transition-colors rounded-2xl px-3 py-2.5 text-right active:scale-[0.99]"
                    >
                      <span className="font-book text-lg text-ink/85 w-7 text-center">{toArabicDigits(s.number)}</span>
                      <SurahOrnamentIcon />
                      <span className="font-quran text-xl text-ink/90 flex-1">{s.name}</span>
                      <span className="text-xs text-muted-foreground font-ui">{s.revelationType} · {toArabicDigits(s.ayahCount)} آية</span>
                    </button>
                  ))}

                {subTab === "juz" && (
                  <>
                    <div className="flex items-center justify-between px-1 pb-1">
                      <button
                        onClick={() => setJuzPage((p) => Math.max(1, p - 1))}
                        disabled={juzPage === 1}
                        className="text-sm text-primary disabled:opacity-40 px-3 py-1"
                      >
                        السابق
                      </button>
                      <span className="text-sm font-bold text-ink/80">الجزء {toArabicDigits(juzPage)}</span>
                      <button
                        onClick={() => setJuzPage((p) => Math.min(30, p + 1))}
                        disabled={juzPage === 30}
                        className="text-sm text-primary disabled:opacity-40 px-3 py-1"
                      >
                        التالي
                      </button>
                    </div>
                    {juzData?.surahs.map((s) => (
                      <button
                        key={s.number}
                        onClick={() => openOverlay({ kind: "reader", surah: s.number, ayah: 1, page: s.pageFrom })}
                        className="w-full flex items-center gap-3 bg-card-bg/80 hover:bg-accent rounded-2xl px-3 py-3 text-right"
                      >
                        <span className="font-book text-lg text-ink/85 w-7 text-center">{toArabicDigits(s.number)}</span>
                        <span className="font-quran text-lg text-ink/90 flex-1">{s.name}</span>
                        <span className="text-xs text-muted-foreground">ص {toArabicDigits(s.pageFrom)}–{toArabicDigits(s.pageTo)}</span>
                      </button>
                    ))}
                  </>
                )}

                {subTab === "page" && (
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {Array.from({ length: 604 }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => openOverlay({ kind: "reader", surah: 1, ayah: 1, page: p })}
                        className="aspect-square rounded-xl bg-card-bg/80 hover:bg-primary hover:text-white text-sm font-book transition-colors flex items-center justify-center"
                      >
                        {toArabicDigits(p)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="max-h-[52vh] overflow-y-auto nice-scrollbar px-2 py-3 space-y-2.5">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    const first = t.ayahs?.[0];
                    if (first) openOverlay({ kind: "reader", surah: first.surah, ayah: first.ayah });
                  }}
                  className="w-full text-right bg-gradient-to-l from-secondary to-accent rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink/90">{t.title}</span>
                    <span className="text-xs text-primary font-medium">{toArabicDigits(t.ayahCount)} آية</span>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </button>
              ))}
              <p className="text-[11px] text-muted-foreground text-center pt-2 leading-relaxed">
                التصنيفات مرجعية قابلة للمراجعة العلمية من لوحة الإدارة
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
