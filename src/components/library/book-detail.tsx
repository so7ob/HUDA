"use client";

/**
 * شاشة تفاصيل الكتاب (overlay) — غلاف دائري، مفضلة، بيانات النشر،
 * وزرا «اقرأ» و«الوسائط» المثبتان في الأسفل.
 */
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { LogoMark } from "@/components/shared/logo";
import {
  BadgeCheck,
  BookMarked,
  BookOpen,
  ChevronRight,
  CirclePlay,
  Heart,
  ListOrdered,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function InfoRow({ icon: Icon, label, value }: { icon: typeof BookMarked; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={17} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <p className="leading-relaxed">
        <span className="font-bold text-ink/85">{label}: </span>
        <span className="text-muted-foreground">{value}</span>
      </p>
    </div>
  );
}

export function BookDetailScreen({ bookId, onClose }: { bookId: string; onClose: () => void }) {
  const { openOverlay } = useAppStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["book", bookId], queryFn: () => api.book(bookId) });
  const { data: favsData } = useQuery({ queryKey: ["favorites"], queryFn: api.favorites });

  const book = data?.book;
  const chapters = data?.chapters ?? [];
  const chapterCount = book?.chapterCount ?? chapters.length;
  const favRefKey = `book:${bookId}`;
  const isFav = !!favsData?.favorites.some((f) => f.kind === "book" && f.refKey === favRefKey);

  const favMutation = useMutation({
    mutationFn: async () => {
      if (!book) return;
      if (isFav) await api.removeFavorite("book", favRefKey);
      else await api.addFavorite("book", favRefKey, book.title, book.sectionTitle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isFav ? "أُزيل الكتاب من المفضلة" : "أُضيف الكتاب إلى المفضلة");
    },
    onError: () => toast.error("تعذّر تنفيذ العملية، حاول مجددًا"),
  });

  /* سجّل آخر كتاب قُرئ (يُستخدم للاستئناس السريع) */
  useEffect(() => {
    if (book) {
      try {
        localStorage.setItem("noor-last-book", JSON.stringify({ bookId, title: book.title }));
      } catch {
        /* التخزين المحلي غير متاح */
      }
    }
  }, [book, bookId]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label={`تفاصيل كتاب ${book?.title ?? ""}`}>
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
          <h1 className="font-bold text-lg flex-1 truncate px-1 text-center">{book?.title ?? "الكتاب"}</h1>
          <span className="w-11 shrink-0" aria-hidden="true" />
        </div>
      </div>

      {/* ✦ المحتوى ✦ */}
      <div className="max-w-lg mx-auto px-4 pb-44 pt-6">
        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
          </div>
        )}

        {!isLoading && !book && (
          <div className="flex flex-col items-center gap-3 py-20 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <BookOpen size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">تعذّر العثور على الكتاب</p>
            <p className="text-sm text-muted-foreground">ربما حُذف أو لم يُنشر بعد.</p>
          </div>
        )}

        {book && (
          <div className="anim-fade-up">
            {/* الغلاف الدائري */}
            <div className="flex justify-center">
              <div
                className={cn(
                  "relative w-36 h-36 rounded-full bg-cover-gradient shadow-xl flex items-center justify-center ring-4 ring-white",
                  book.coverStyle === "sand" && "sand",
                  book.coverStyle === "night" && "night"
                )}
                aria-hidden="true"
              >
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.3) 0, transparent 45%), radial-gradient(circle at 75% 78%, rgba(255,255,255,0.16) 0, transparent 45%)",
                  }}
                />
                {book.coverEmoji ? (
                  <span className="relative text-5xl drop-shadow">{book.coverEmoji}</span>
                ) : (
                  <LogoMark size={58} className="relative text-white" />
                )}
              </div>
            </div>

            {/* العنوان + زر المفضلة */}
            <div className="mt-5 flex items-start justify-center gap-1.5">
              <h2 className="flex-1 font-book text-2xl leading-snug text-ink/95 text-center">{book.title}</h2>
              <button
                onClick={() => favMutation.mutate()}
                disabled={favMutation.isPending}
                className={cn(
                  "touch-target shrink-0 flex items-center justify-center rounded-full transition-colors",
                  isFav ? "text-rose-500 hover:bg-rose-500/10" : "text-muted-foreground hover:text-rose-500 hover:bg-accent"
                )}
                aria-label={isFav ? "إزالة الكتاب من المفضلة" : "إضافة الكتاب إلى المفضلة"}
                aria-pressed={isFav}
              >
                <Heart size={24} className={isFav ? "fill-current" : ""} />
              </button>
            </div>
            {book.subtitle && <p className="text-center text-sm text-muted-foreground mt-1">{book.subtitle}</p>}

            <hr className="my-5 border-border" />

            {/* المؤلف */}
            {book.author && (
              <p className="text-center font-ui font-bold text-primary">{book.author}</p>
            )}

            {/* الوصف */}
            {book.description && (
              <p className="mt-3 text-center text-[15px] leading-[2] text-muted-foreground whitespace-pre-line">
                {book.description}
              </p>
            )}

            {/* معلومات إضافية */}
            <div className="mt-6 bg-secondary/70 rounded-2xl p-4 space-y-3 text-sm">
              {book.edition && <InfoRow icon={BadgeCheck} label="التحقيق والطبعة" value={book.edition} />}
              {book.sourceName && <InfoRow icon={BookMarked} label="المصدر" value={book.sourceName} />}
              {book.licenseNote && <InfoRow icon={ShieldCheck} label="الحقوق" value={book.licenseNote} />}
              <InfoRow icon={ListOrdered} label="عدد الفصول" value={toArabicDigits(chapterCount)} />
            </div>
          </div>
        )}
      </div>

      {/* ✦ الأزرار المثبتة ✦ */}
      {book && (
        <div
          className="fixed bottom-0 inset-x-0 z-30"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <div className="max-w-lg mx-auto px-4">
            <div className="bg-background/95 backdrop-blur border border-border/70 rounded-3xl shadow-xl p-3 flex gap-3">
              <button
                onClick={() => openOverlay({ kind: "book", bookId, chapterId: chapters[0]?.id })}
                disabled={chapterCount === 0}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:brightness-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="قراءة الكتاب من الفصل الأول"
              >
                <BookOpen size={20} aria-hidden="true" />
                اقرأ
              </button>
              {book.mediaUrl && (
                <button
                  onClick={() => window.open(book.mediaUrl, "_blank", "noopener,noreferrer")}
                  className="flex-1 min-h-[48px] flex items-center justify-center gap-2 border border-border rounded-2xl font-bold text-primary hover:bg-accent active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={book.mediaLabel ?? "فتح الوسائط"}
                >
                  <CirclePlay size={20} aria-hidden="true" />
                  {book.mediaLabel ?? "الوسائط"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
