"use client";

/**
 * قارئ الكتب (overlay) — فصول بخط أميري، تكبير/تصغير الخط، تمرير تلقائي،
 * نسخ ومشاركة الفصل، علامة مرجعية، فهرس منسدل، وتنقّل بين الفصول.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { OrnamentHeaderBox, toArabicDigits } from "@/components/shared/ornaments";
import {
  BookOpen,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  List,
  Loader2,
  MoveVertical,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FONT_KEY = "noor-book-font";
const MIN_FONT = 13;
const MAX_FONT = 30;

/** تحويل محتوى الفصل إلى فقرات مع دعم **النص العريض** */
function renderChapterContent(content: string, fontSize: number): ReactNode[] {
  return content
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className="font-book text-ink/90 leading-[2.1] mb-5 text-justify" style={{ fontSize }}>
          {parts.map((p, idx) =>
            idx % 2 === 1 ? (
              <strong key={idx} className="font-bold">
                {p}
              </strong>
            ) : (
              <span key={idx}>{p}</span>
            )
          )}
        </p>
      );
    });
}

export function BookReaderScreen({
  bookId,
  chapterId,
}: {
  bookId: string;
  chapterId?: string;
  onClose: () => void;
}) {
  const autoScrollSpeed = useAppStore((s) => s.readerPrefs.autoScrollSpeed);
  const { openOverlay } = useAppStore();
  const queryClient = useQueryClient();

  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(() => {
    /* شاشات الـ overlay تُركَّب بعد الترطيب (عميل فقط) — لذا القراءة المبدئية آمنة */
    if (chapterId) return chapterId;
    try {
      return localStorage.getItem(`noor-book-pos:${bookId}`) ?? undefined;
    } catch {
      return undefined;
    }
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const v = parseInt(localStorage.getItem(FONT_KEY) ?? "", 10);
      if (Number.isFinite(v) && v >= MIN_FONT && v <= MAX_FONT) return v;
    } catch {
      /* التخزين المحلي غير متاح */
    }
    return 17;
  });
  const [autoScroll, setAutoScroll] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["book", bookId], queryFn: () => api.book(bookId) });

  const book = data?.book;
  const chapters = data?.chapters ?? [];
  /* الفصل الفعّال: المُحدَّد ← أول فصل (تُشتق مشتقًّا بلا تأثيرات) */
  const chapter = chapters.find((c) => c.id === activeChapterId) ?? chapters[0] ?? null;
  const activeIdx = chapter ? chapters.findIndex((c) => c.id === chapter.id) : -1;
  const prevChapter = activeIdx > 0 ? chapters[activeIdx - 1] : null;
  const nextChapter = activeIdx >= 0 && activeIdx < chapters.length - 1 ? chapters[activeIdx + 1] : null;

  const changeFont = (delta: number) => {
    setFontSize((s) => {
      const n = Math.min(MAX_FONT, Math.max(MIN_FONT, s + delta));
      try {
        localStorage.setItem(FONT_KEY, String(n));
      } catch {
        /* التخزين المحلي غير متاح */
      }
      return n;
    });
  };

  /* حفظ آخر موضع قراءة في هذا الكتاب (كتابة لنظام خارجي فقط) */
  useEffect(() => {
    if (!chapter) return;
    try {
      localStorage.setItem(`noor-book-pos:${bookId}`, chapter.id);
    } catch {
      /* التخزين المحلي غير متاح */
    }
  }, [chapter, bookId]);

  const selectChapter = (id: string) => {
    setAutoScroll(false);
    setActiveChapterId(id);
    setIndexOpen(false);
    window.scrollTo({ top: 0 });
  };

  /* علامة مرجعية */
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!book || !chapter) return;
      await api.addBookmark("book_chapter", `book:${bookId}:ch:${chapter.id}`, `${book.title} — ${chapter.title}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("أُضيفت علامة مرجعية عند هذا الفصل");
    },
    onError: () => toast.error("تعذّر إضافة العلامة المرجعية"),
  });

  /* نسخ الفصل */
  const copyChapter = () => {
    if (!chapter || !book) return;
    const plain = chapter.content.replace(/\*\*/g, "");
    navigator.clipboard
      .writeText(`${chapter.title}\n\n${plain}\n— من كتاب «${book.title}»، تطبيق نور الهدى`)
      .then(() => toast.success("تم نسخ الفصل"))
      .catch(() => toast.error("تعذّر النسخ"));
  };

  /* مشاركة الفصل */
  const shareChapter = async () => {
    if (!chapter || !book) return;
    const plain = chapter.content.replace(/\*\*/g, "");
    const text = `${chapter.title}\n\n${plain}\n— من كتاب «${book.title}»، تطبيق نور الهدى`;
    if (navigator.share) {
      try {
        await navigator.share({ title: chapter.title, text });
      } catch {
        /* أُلغيت المشاركة */
      }
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success("نُسخ نص المشاركة"));
    }
  };

  /* ✦ التمرير التلقائي (rAF) بسرعة من إعدادات القارئ، يقف عند التمرير اليدوي ونهاية الصفحة ✦ */
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  useEffect(() => {
    if (!autoScroll) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    let paused = false;
    const onUserScroll = () => {
      if (lastTsRef.current) paused = true;
    };
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    const step = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (!paused) window.scrollBy({ top: autoScrollSpeed * dt, behavior: "auto" });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
    };
  }, [autoScroll, autoScrollSpeed]);

  /* إيقاف التمرير التلقائي عند الوصول للأسفل */
  useEffect(() => {
    if (!autoScroll) return;
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) setAutoScroll(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoScroll]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label={`قارئ كتاب ${book?.title ?? ""}`}>
      {/* ✦ الترويسة اللاصقة ✦ */}
      <div className="sticky top-0 z-20 bg-header-gradient text-white shadow-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-lg mx-auto px-3 h-14 flex items-center">
          {/* رجوع إلى تفاصيل الكتاب */}
          <button
            onClick={() => openOverlay({ kind: "book", bookId })}
            className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={26} />
          </button>
          <h1 className="font-bold text-lg flex-1 truncate px-1 text-center">{book?.title ?? "الكتاب"}</h1>
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setAutoScroll((v) => !v)}
              className={cn("touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors", autoScroll && "bg-white/20")}
              aria-label="التمرير التلقائي"
              aria-pressed={autoScroll}
              title="التمرير التلقائي"
            >
              <MoveVertical size={21} />
            </button>
            <button
              onClick={() => bookmarkMutation.mutate()}
              disabled={!chapter || bookmarkMutation.isPending}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="إضافة علامة مرجعية"
              title="علامة مرجعية"
            >
              <BookmarkPlus size={21} />
            </button>
            <button
              onClick={() => setIndexOpen(true)}
              disabled={chapters.length === 0}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="فهرس الفصول"
              title="فهرس الفصول"
            >
              <List size={21} />
            </button>
          </div>
        </div>
        {/* شريط الأدوات: حجم الخط + نسخ + مشاركة */}
        <div className="max-w-lg mx-auto px-4 pb-2.5 flex items-center justify-center gap-2">
          <div className="bg-white/15 backdrop-blur rounded-full flex items-center" role="group" aria-label="حجم خط الكتاب">
            <button
              onClick={() => changeFont(-1)}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors font-bold text-sm"
              aria-label="تصغير الخط"
            >
              A-
            </button>
            <span className="w-8 text-center text-xs font-bold" aria-live="polite">
              {toArabicDigits(fontSize)}
            </span>
            <button
              onClick={() => changeFont(1)}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors font-bold text-sm"
              aria-label="تكبير الخط"
            >
              A+
            </button>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-full flex items-center">
            <button
              onClick={copyChapter}
              disabled={!chapter}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="نسخ الفصل"
            >
              <Copy size={17} />
            </button>
            <button
              onClick={shareChapter}
              disabled={!chapter}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="مشاركة الفصل"
            >
              <Share2 size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ✦ محتوى الفصل ✦ */}
      <div className="max-w-lg mx-auto px-4 pb-28 pt-5">
        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
          </div>
        )}

        {!isLoading && chapters.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <BookOpen size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">لا توجد فصول منشورة بعد</p>
            <p className="text-sm text-muted-foreground leading-relaxed">ستظهر فصول هذا الكتاب هنا فور اعتمادها.</p>
          </div>
        )}

        {chapter && (
          <article className="anim-fade-up">
            <OrnamentHeaderBox title={chapter.title} className="mb-2" />
            <p className="text-center text-xs text-muted-foreground font-ui mb-6">
              الفصل {toArabicDigits(chapter.number)} من {toArabicDigits(chapters.length)}
            </p>
            <div className="bg-reading-gradient rounded-3xl px-5 py-6 card-soft">
              {renderChapterContent(chapter.content, fontSize)}
            </div>

            {/* التنقل بين الفصول — في RTL: السابق يمينًا */}
            <div className="mt-7 flex items-center gap-3">
              <button
                onClick={() => prevChapter && selectChapter(prevChapter.id)}
                disabled={!prevChapter}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-white text-sm font-bold text-primary hover:bg-accent disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={prevChapter ? `الفصل السابق: ${prevChapter.title}` : "لا يوجد فصل سابق"}
              >
                <ChevronRight size={18} aria-hidden="true" />
                الفصل السابق
              </button>
              <button
                onClick={() => nextChapter && selectChapter(nextChapter.id)}
                disabled={!nextChapter}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-white text-sm font-bold text-primary hover:bg-accent disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={nextChapter ? `الفصل التالي: ${nextChapter.title}` : "لا يوجد فصل تالٍ"}
              >
                الفصل التالي
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            </div>
          </article>
        )}
      </div>

      {/* زر إيقاف التمرير التلقائي العائم */}
      {autoScroll && (
        <button
          onClick={() => setAutoScroll(false)}
          className="fixed bottom-8 left-4 z-30 w-12 h-12 rounded-full bg-cream-deep text-ink shadow-lg flex items-center justify-center hover:brightness-105 active:scale-95 transition-all"
          aria-label="إيقاف التمرير التلقائي"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </button>
      )}

      {/* ✦ درج فهرس الفصول ✦ */}
      <AnimatePresence>
        {indexOpen && (
          <div className="fixed inset-0 z-[60]" role="dialog" aria-label="فهرس الفصول" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setIndexOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
              className="absolute top-0 bottom-0 right-0 w-[86%] max-w-sm bg-background shadow-2xl flex flex-col"
            >
              <div className="bg-header-gradient text-white px-4 h-14 flex items-center justify-between shrink-0">
                <h2 className="font-bold">فهرس الفصول</h2>
                <button
                  onClick={() => setIndexOpen(false)}
                  className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  aria-label="إغلاق الفهرس"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto nice-scrollbar p-3 space-y-2">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectChapter(c.id)}
                    className={cn(
                      "w-full text-right rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-colors",
                      c.id === chapter?.id ? "bg-secondary text-primary font-bold" : "hover:bg-accent text-ink/85"
                    )}
                    aria-label={`الانتقال إلى ${c.title}`}
                    aria-current={c.id === chapter?.id ? "true" : undefined}
                  >
                    <span className="w-8 h-8 shrink-0 rounded-full bg-secondary text-primary text-xs font-bold flex items-center justify-center border border-primary/25">
                      {toArabicDigits(c.number)}
                    </span>
                    <span className="font-book leading-snug line-clamp-2 flex-1">{c.title}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
