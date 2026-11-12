"use client";

/**
 * شاشة تبويب «مع الرسول والرسالة» — أقسام السيرة والرسالة من محرك الأقسام،
 * مع بطاقات كتب بأغلفة متدرجة تتبع لون كل قسم.
 */
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api, type LibrarySectionItem } from "@/lib/api";
import { OrnamentHeaderBox } from "@/components/shared/ornaments";
import { LogoMark } from "@/components/shared/logo";
import { Loader2, Menu, MoonStar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/** نسخة تدرج الغلاف حسب لون القسم (teal افتراضيًا) */
function sectionCoverVariant(color?: string): string {
  const c = (color ?? "").toLowerCase();
  if (c.includes("sand") || c.includes("gold") || c.includes("ذهبي")) return "sand";
  if (c.includes("night") || c.includes("dark") || c.includes("ليلي")) return "night";
  return "";
}

function BookCard({ title, author, emoji, variant, onClick }: {
  title: string;
  author?: string;
  emoji?: string;
  variant: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group shrink-0 w-36 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`فتح كتاب ${title}`}
    >
      <div
        className={cn(
          "relative w-36 h-44 rounded-2xl bg-cover-gradient shadow-lg overflow-hidden transition-transform group-hover:scale-[1.02] group-active:scale-[0.97]",
          variant
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
        <div className="absolute top-3.5 inset-x-0 flex justify-center">
          {emoji ? (
            <span className="text-[1.8rem] leading-none drop-shadow" aria-hidden="true">
              {emoji}
            </span>
          ) : (
            <LogoMark size={30} className="text-white/90" />
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/50 via-black/25 to-transparent">
          <p className="font-book font-bold text-white text-[13px] leading-snug line-clamp-2">{title}</p>
          {author && <p className="text-[10px] text-white/80 mt-0.5 line-clamp-1">{author}</p>}
        </div>
      </div>
    </button>
  );
}

export function ProphetScreen() {
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

  /* كل قسم موجود فعليًا فيه كتب منشورة — بلا أقسام مبرمجة بأسماء */
  const groups = sections
    .map((s: LibrarySectionItem) => ({ section: s, sectionBooks: books.filter((b) => b.sectionId === s.id) }))
    .filter((g) => g.sectionBooks.length > 0);

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
            <h1 className="font-ui font-bold text-xl tracking-tight whitespace-nowrap">مع الرسول والرسالة</h1>
            <button
              onClick={() => openOverlay({ kind: "favorites" })}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="القائمة والمفضلة"
            >
              <Menu size={24} strokeWidth={1.8} />
            </button>
          </div>

          {/* ✦ بطاقة الترحيب ✦ */}
          <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur px-4 py-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <MoonStar size={20} aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed">قبسات من هدي الرسالة والرسالة — تصفح المحتوى المعتمد</p>
          </div>
        </div>
      </header>

      {/* ✦ اللوحة البيضاء ✦ */}
      <main className="max-w-lg mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-t-[28px] pt-5 pb-6 shadow-[0_-6px_24px_rgba(23,90,94,0.08)]">
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
            </div>
          )}

          {!isLoading && groups.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
              <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <LogoMark size={36} className="text-primary/50" />
              </span>
              <p className="font-bold text-ink/85">لا يوجد محتوى منشور بعد</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ستظهر أقسام السيرة والرسالة هنا فور نشر الكتب المعتمدة.
              </p>
            </div>
          )}

          {groups.map(({ section, sectionBooks }, gi) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(gi * 0.06, 0.3) }}
              className="mb-8"
              aria-label={section.title}
            >
              <OrnamentHeaderBox title={section.title} className="mb-4 px-2" />
              <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 pb-1">
                {sectionBooks.map((b) => (
                  <BookCard
                    key={b.id}
                    title={b.title}
                    author={b.author}
                    emoji={b.coverEmoji}
                    variant={sectionCoverVariant(section.color)}
                    onClick={() => openOverlay({ kind: "book", bookId: b.id })}
                  />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </main>
    </div>
  );
}
