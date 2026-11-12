"use client";

/**
 * شاشة المفضلة والعلامات المرجعية (overlay) — تبويبان بنمط pill،
 * حذف مباشر، وانتقال ذكي إلى مصدر كل عنصر (آية/تفسير/كتاب/صفحة/فصل).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api, type BookmarkItem, type FavoriteItem } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import {
  BookOpen,
  Bookmark,
  ChevronRight,
  FileText,
  Heart,
  HeartOff,
  Library as LibraryIcon,
  Loader2,
  ScrollText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FavTab = "favorites" | "bookmarks";

const FAV_KIND_LABELS: Record<string, string> = {
  ayah: "آية",
  tafsir: "تفسير",
  book: "كتاب",
};

const BOOKMARK_KIND_LABELS: Record<string, string> = {
  page: "صفحة مصحف",
  book_chapter: "فصل كتاب",
};

/** تاريخ مقروء بالعربية */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

interface RowProps {
  icon: typeof Heart;
  label: string;
  detail?: string;
  meta: string;
  openLabel: string;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function ItemRow({ icon: Icon, label, detail, meta, openLabel, onOpen, onDelete, deleting }: RowProps) {
  return (
    <div className="flex items-center gap-2.5 bg-card-bg/80 hover:bg-accent rounded-2xl px-3 py-2.5 transition-colors">
      <button
        onClick={onOpen}
        className="flex items-center gap-3 flex-1 min-w-0 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        aria-label={openLabel}
      >
        <span className="w-10 h-10 shrink-0 rounded-xl bg-secondary text-primary flex items-center justify-center" aria-hidden="true">
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-ink/90 truncate">{label}</span>
          {detail && <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-1">{detail}</span>}
          <span className="block text-[10px] text-muted-foreground/80 mt-0.5">{meta}</span>
        </span>
      </button>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        aria-label={`حذف: ${label}`}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

export function FavoritesScreen({ onClose }: { onClose: () => void }) {
  const { openOverlay } = useAppStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FavTab>("favorites");

  const { data: favsData, isLoading: favsLoading } = useQuery({ queryKey: ["favorites"], queryFn: api.favorites });
  const { data: marksData, isLoading: marksLoading } = useQuery({ queryKey: ["bookmarks"], queryFn: api.bookmarks });
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs });

  const removeFav = useMutation({
    mutationFn: (f: FavoriteItem) => api.removeFavorite(f.kind, f.refKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("أُزيلت من المفضلة");
    },
    onError: () => toast.error("تعذّر الحذف، حاول مجددًا"),
  });

  const removeMark = useMutation({
    mutationFn: (b: BookmarkItem) => api.removeBookmark(b.kind, b.refKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("حُذفت العلامة المرجعية");
    },
    onError: () => toast.error("تعذّر الحذف، حاول مجددًا"),
  });

  /* تحويل الرقم العالمي للآية إلى (سورة، رقمها فيها) عبر خرائط تراكمية */
  const locateAyah = useMemo(() => {
    const surahs = surahsData?.surahs ?? [];
    return (globalId: number): { surah: number; numberInSurah: number } | null => {
      let cum = 0;
      for (const s of surahs) {
        if (globalId <= cum + s.ayahCount) return { surah: s.number, numberInSurah: globalId - cum };
        cum += s.ayahCount;
      }
      return null;
    };
  }, [surahsData]);

  const openFavorite = (f: FavoriteItem) => {
    if (f.kind === "ayah" && f.refKey.startsWith("ayah:")) {
      const gid = parseInt(f.refKey.slice(5), 10);
      const loc = Number.isFinite(gid) ? locateAyah(gid) : null;
      if (loc) {
        openOverlay({ kind: "reader", surah: loc.surah, ayah: loc.numberInSurah });
      }
      return;
    }
    if (f.kind === "tafsir" && f.refKey.startsWith("tafsir:")) {
      const [s, a] = f.refKey.slice(7).split(":").map((x) => parseInt(x, 10));
      if (Number.isFinite(s) && Number.isFinite(a)) {
        openOverlay({ kind: "reader", surah: s, ayah: a });
      }
      return;
    }
    if (f.kind === "book" && f.refKey.startsWith("book:")) {
      openOverlay({ kind: "book", bookId: f.refKey.slice(5) });
    }
  };

  const openBookmark = (b: BookmarkItem) => {
    if (b.kind === "page" && b.refKey.startsWith("page:")) {
      const n = parseInt(b.refKey.slice(5), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 604) {
        openOverlay({ kind: "reader", surah: 1, ayah: 1, page: n });
      }
      return;
    }
    if (b.kind === "book_chapter") {
      const m = b.refKey.match(/^book:(.+):ch:(.+)$/);
      if (m) {
        openOverlay({ kind: "book", bookId: m[1], chapterId: m[2] });
      }
    }
  };

  const favorites = favsData?.favorites ?? [];
  const bookmarks = marksData?.bookmarks ?? [];
  const isLoading = favsLoading || marksLoading;

  const favIcon = (kind: string) =>
    kind === "ayah" ? ScrollText : kind === "tafsir" ? BookOpen : kind === "book" ? LibraryIcon : Heart;
  const markIcon = (kind: string) => (kind === "page" ? FileText : Bookmark);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label="المفضلة والعلامات المرجعية">
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
          <h1 className="font-bold text-lg flex-1 truncate px-1 text-center">المفضلة والعلامات</h1>
          <span className="w-11 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28 pt-4">
        {/* ✦ التبويبان بنمط pill ✦ */}
        <div className="bg-secondary rounded-full p-1 flex mb-5" role="tablist" aria-label="المفضلة والعلامات">
          {(
            [
              ["favorites", "المفضلة", favorites.length],
              ["bookmarks", "العلامات المرجعية", bookmarks.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              role="tab"
              aria-selected={tab === id}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                tab === id ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-primary"
              )}
            >
              {label}
              {count > 0 && <span className="text-[11px] opacity-80"> ({toArabicDigits(count)})</span>}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ التحميل" />
          </div>
        )}

        {!isLoading && tab === "favorites" && favorites.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <HeartOff size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">لا توجد عناصر في المفضلة بعد</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              اضغط أيقونة القلب بجانب أي آية أو كتاب لحفظها هنا والوصول السريع إليها.
            </p>
          </div>
        )}

        {!isLoading && tab === "bookmarks" && bookmarks.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Bookmark size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">لا توجد علامات مرجعية بعد</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              احفظ موضعك في المصحف أو الكتب بأيقونة العلامة لتعود إليه لاحقًا.
            </p>
          </div>
        )}

        {/* ✦ قائمة المفضلة ✦ */}
        {!isLoading && tab === "favorites" && (
          <div className="space-y-2.5" role="tabpanel" aria-label="قائمة المفضلة">
            {favorites.map((f) => (
              <ItemRow
                key={f.id}
                icon={favIcon(f.kind)}
                label={f.label}
                detail={f.detail}
                meta={`${FAV_KIND_LABELS[f.kind] ?? "عنصر"} · ${formatDate(f.createdAt)}`}
                openLabel={`فتح: ${f.label}`}
                onOpen={() => openFavorite(f)}
                onDelete={() => removeFav.mutate(f)}
                deleting={removeFav.isPending && removeFav.variables?.id === f.id}
              />
            ))}
          </div>
        )}

        {/* ✦ قائمة العلامات ✦ */}
        {!isLoading && tab === "bookmarks" && (
          <div className="space-y-2.5" role="tabpanel" aria-label="قائمة العلامات المرجعية">
            {bookmarks.map((b) => (
              <ItemRow
                key={b.id}
                icon={markIcon(b.kind)}
                label={b.label}
                meta={`${BOOKMARK_KIND_LABELS[b.kind] ?? "علامة"} · ${formatDate(b.createdAt)}`}
                openLabel={`فتح: ${b.label}`}
                onOpen={() => openBookmark(b)}
                onDelete={() => removeMark.mutate(b)}
                deleting={removeMark.isPending && removeMark.variables?.id === b.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
