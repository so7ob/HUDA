"use client";

/**
 * شاشة قسم الكتب (overlay) — بحث محلي داخل القسم + قائمة كتب بأغلفة.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { LogoMark } from "@/components/shared/logo";
import { normalizeArabic } from "@/lib/arabic";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Search, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookSectionScreen({ sectionKey, onClose }: { sectionKey: string; onClose: () => void }) {
  const { openOverlay } = useAppStore();
  const [q, setQ] = useState("");

  const { data: sectionsData } = useQuery({ queryKey: ["library-sections"], queryFn: api.sections });
  const { data: booksData, isLoading } = useQuery({
    queryKey: ["library-books", sectionKey],
    queryFn: () => api.books(sectionKey),
  });

  const section = sectionsData?.sections.find((s) => s.key === sectionKey);
  const books = booksData?.books ?? [];

  const filtered = useMemo(() => {
    const nq = normalizeArabic(q.trim());
    if (!nq) return books;
    return books.filter((b) => normalizeArabic(`${b.title} ${b.author ?? ""} ${b.description ?? ""}`).includes(nq));
  }, [books, q]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label={`قسم ${section?.title ?? "الكتب"}`}>
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
          <h1 className="font-bold text-lg flex-1 truncate px-1 text-center">{section?.title ?? "قسم"}</h1>
          <span className="text-xs bg-white/15 rounded-full px-2.5 py-1 shrink-0" aria-live="polite">
            {toArabicDigits(books.length)} كتاب
          </span>
        </div>
        {/* بحث محلي داخل القسم */}
        <div className="max-w-lg mx-auto px-4 pt-1 pb-3">
          <div className="relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في كتب القسم بالعنوان أو المؤلف…"
              aria-label="بحث في كتب القسم"
              className="w-full bg-white/95 text-ink rounded-full py-2.5 pr-11 pl-11 text-sm shadow-sm outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-white/60 transition-shadow"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="مسح البحث"
              >
                <X size={17} className="text-ink/50" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ✦ قائمة الكتب ✦ */}
      <div className="max-w-lg mx-auto px-4 pb-28 pt-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
          </div>
        )}

        {!isLoading && books.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <BookOpen size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">لا توجد كتب في هذا القسم بعد</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              سيظهر محتوى هذا القسم هنا فور نشره واعتماده.
            </p>
          </div>
        )}

        {!isLoading && books.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <SearchX size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">لا توجد نتائج</p>
            <p className="text-sm text-muted-foreground leading-relaxed">جرّب كلمة بحث أخرى أو تحقق من الإملاء.</p>
          </div>
        )}

        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => openOverlay({ kind: "book", bookId: b.id })}
            className="w-full flex items-center gap-3.5 bg-card-bg/80 hover:bg-accent rounded-2xl p-3 text-right transition-all active:scale-[0.99] card-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`فتح كتاب ${b.title}`}
          >
            <span
              className={cn(
                "relative w-16 h-[84px] rounded-xl bg-cover-gradient shrink-0 flex items-center justify-center overflow-hidden shadow",
                b.coverStyle === "sand" && "sand",
                b.coverStyle === "night" && "night"
              )}
              aria-hidden="true"
            >
              {b.coverEmoji ? (
                <span className="text-2xl">{b.coverEmoji}</span>
              ) : (
                <LogoMark size={26} className="text-white/90" />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-book font-bold text-ink/90 leading-snug line-clamp-2">{b.title}</span>
              {b.author && <span className="block text-xs text-muted-foreground mt-1 truncate">{b.author}</span>}
              <span className="block text-[11px] text-primary font-bold mt-1">
                {toArabicDigits(b.chapterCount ?? 0)} فصل
              </span>
            </span>
            <ChevronLeft size={18} className="text-muted-foreground/60 shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
