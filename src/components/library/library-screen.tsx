"use client";

/**
 * شاشة تبويب «المكتبة» — الأقسام الكبيرة، أحدث الإضافات،
 * وزر الوصول السريع إلى المفضلة والعلامات المرجعية.
 */
import type { ElementType } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api, type BookItem } from "@/lib/api";
import { OrnamentHeaderBox, toArabicDigits } from "@/components/shared/ornaments";
import { LogoMark } from "@/components/shared/logo";
import {
  AudioLines,
  BookOpen,
  ChevronLeft,
  GraduationCap,
  HandHeart,
  Heart,
  Library as LibraryIcon,
  Loader2,
  Mail,
  Menu,
  Mic,
  MoonStar,
  Presentation,
  Settings,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** خريطة أيقونات الأقسام القادمة من محرك المحتوى */
const SECTION_ICONS: Record<string, ElementType> = {
  "book-open": BookOpen,
  mail: Mail,
  mic: Mic,
  "graduation-cap": GraduationCap,
  presentation: Presentation,
  "hand-heart": HandHeart,
  "moon-star": MoonStar,
  "audio-lines": AudioLines,
  video: Video,
};

function SectionGlyph({ icon, size = 22 }: { icon: string; size?: number }) {
  const Icon = SECTION_ICONS[icon] ?? BookOpen;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

/** بطاقة غلاف كتاب مصغّرة للصفوف الأفقية */
function BookCoverCard({ book, onClick }: { book: BookItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group shrink-0 w-36 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`فتح كتاب ${book.title}`}
    >
      <div
        className={cn(
          "relative w-36 h-48 rounded-2xl bg-cover-gradient shadow-lg overflow-hidden transition-transform group-hover:scale-[1.02] group-active:scale-[0.97]",
          book.coverStyle === "sand" && "sand",
          book.coverStyle === "night" && "night"
        )}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 18%, rgba(255,255,255,0.28) 0, transparent 42%), radial-gradient(circle at 78% 72%, rgba(255,255,255,0.16) 0, transparent 46%)",
          }}
          aria-hidden="true"
        />
        <div className="absolute top-4 inset-x-0 flex justify-center">
          {book.coverEmoji ? (
            <span className="text-[2rem] leading-none drop-shadow" aria-hidden="true">
              {book.coverEmoji}
            </span>
          ) : (
            <LogoMark size={34} className="text-white/90" />
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/50 via-black/25 to-transparent">
          <p className="font-book font-bold text-white text-[13px] leading-snug line-clamp-2">{book.title}</p>
          {book.sectionTitle && <p className="text-[10px] text-white/80 mt-1 line-clamp-1">{book.sectionTitle}</p>}
        </div>
      </div>
    </button>
  );
}

export function LibraryScreen() {
  const { openOverlay, setTab } = useAppStore();

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ["library-sections"],
    queryFn: api.sections,
  });
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ["library-books"],
    queryFn: () => api.books(),
  });

  const sections = sectionsData?.sections ?? [];
  const books = booksData?.books ?? [];
  const isLoading = sectionsLoading || booksLoading;
  const latest = books.slice(0, 12);
  const isEmpty = !isLoading && books.length === 0;

  return (
    <div className="pb-28 min-h-screen bg-background">
      {/* ✦ الترويسة الفيروزية ✦ */}
      <header className="bg-header-gradient header-pattern overflow-hidden text-white rounded-b-[28px] pb-10 shadow-md">
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setTab("settings")}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="الإعدادات"
            >
              <Settings size={24} strokeWidth={1.8} />
            </button>
            <h1 className="font-ui font-bold text-xl tracking-tight whitespace-nowrap">المكتبة</h1>
            <button
              onClick={() => openOverlay({ kind: "favorites" })}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="القائمة والمفضلة"
            >
              <Menu size={24} strokeWidth={1.8} />
            </button>
          </div>
          <p className="mt-3 text-sm text-white/85 leading-relaxed">
            مكتبة ثقافية معتمدة — كتب ومقالات محفوظة للقراءة دون إنترنت
          </p>
        </div>
      </header>

      {/* ✦ اللوحة البيضاء ✦ */}
      <main className="max-w-lg mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-t-[28px] pt-5 pb-4 shadow-[0_-6px_24px_rgba(23,90,94,0.08)]">
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
              <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <LibraryIcon size={36} className="text-primary/50" aria-hidden="true" />
              </span>
              <p className="font-bold text-ink/85">المكتبة في انتظار المحتوى</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                لم تُنشر كتب بعد. ستظهر الإضافات المعتمدة هنا فور اعتمادها من إدارة المحتوى.
              </p>
            </div>
          )}

          {!isLoading && !isEmpty && (
            <>
              {/* ✦ الأقسام الكبيرة ✦ */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2" role="list" aria-label="أقسام المكتبة">
                {sections.map((s, i) => (
                  <motion.button
                    key={s.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    onClick={() => openOverlay({ kind: "bookSection", sectionKey: s.key })}
                    className="shrink-0 w-[112px] rounded-2xl bg-cover-gradient text-white p-3 flex flex-col items-center gap-2 shadow-md hover:brightness-110 active:scale-[0.96] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label={`قسم ${s.title} — ${toArabicDigits(s.bookCount ?? 0)} كتاب`}
                  >
                    <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                      <SectionGlyph icon={s.icon} />
                    </span>
                    <span className="text-sm font-bold leading-tight text-center line-clamp-2 min-h-[2.5rem] flex items-center">
                      {s.title}
                    </span>
                    <span className="text-[11px] bg-white/15 rounded-full px-2.5 py-0.5">
                      {toArabicDigits(s.bookCount ?? 0)} كتاب
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* ✦ أحدث الإضافات ✦ */}
              {latest.length > 0 && (
                <>
                  <OrnamentHeaderBox title="أحدث الإضافات" className="mt-6 mb-4 px-2" />
                  <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 pb-2" aria-label="أحدث الكتب المضافة">
                    {latest.map((b) => (
                      <BookCoverCard key={b.id} book={b} onClick={() => openOverlay({ kind: "book", bookId: b.id })} />
                    ))}
                  </div>
                </>
              )}

              {/* ✦ المفضلة والعلامات ✦ */}
              <div className="px-4 mt-6">
                <button
                  onClick={() => openOverlay({ kind: "favorites" })}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary text-primary font-bold py-3.5 hover:bg-accent hover:border-primary/40 active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="فتح المفضلة والعلامات المرجعية"
                >
                  <Heart size={20} strokeWidth={2} />
                  المفضلة والعلامات
                  <ChevronLeft size={16} className="opacity-60" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
