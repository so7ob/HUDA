"use client";

/**
 * شاشة البحث الموحد (overlay) — بحث فوري مع تأخير 350ms على المحتوى المخزَّن:
 * الآيات والسور، التفسير، الكتب، الفصول، والمواضيع — مع إبراز المواضع المطابقة.
 */
import { useEffect, useMemo, useState, type ElementType } from "react";
import { toArabicDigits } from "@/components/shared/ornaments";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api, type SearchResultItem } from "@/lib/api";
import { highlightMatches, parseQuery } from "@/lib/arabic";
import {
  BookMarked,
  ChevronRight,
  FileText,
  Library as LibraryIcon,
  Loader2,
  ScrollText,
  Search,
  SearchX,
  Tags,
  WifiOff,
} from "lucide-react";

interface ResultGroup {
  kinds: SearchResultItem["kind"][];
  title: string;
  icon: ElementType;
}

const GROUPS: ResultGroup[] = [
  { kinds: ["ayah", "surah"], title: "الآيات والسور", icon: ScrollText },
  { kinds: ["tafsir"], title: "التفسير", icon: BookMarked },
  { kinds: ["book"], title: "الكتب", icon: LibraryIcon },
  { kinds: ["chapter"], title: "الفصول", icon: FileText },
  { kinds: ["topic"], title: "المواضيع", icon: Tags },
];

export function SearchScreen({ onClose }: { onClose: () => void }) {
  const { openOverlay } = useAppStore();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  /* تأخير البحث 350ms */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const trimmed = debounced.trim();
  const { data, isFetching } = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => api.search(trimmed),
    enabled: trimmed.length >= 1,
    placeholderData: (prev) => prev,
  });

  const tokens = useMemo(() => parseQuery(trimmed), [trimmed]);
  const results = data?.results ?? [];

  const grouped = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: results.filter((r) => g.kinds.includes(r.kind)) })).filter(
        (g) => g.items.length > 0
      ),
    [results]
  );

  const openResult = (r: SearchResultItem) => {
    const tail = (i: number) => r.ref.split(":")[i] ?? "";
    const num = (v: string) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    switch (r.kind) {
      case "ayah":
      case "tafsir": {
        const s = r.surah ?? num(tail(1));
        const a = r.ayahInSurah ?? num(tail(2));
        if (s) {
          openOverlay({ kind: "reader", surah: s, ayah: a ?? 1 });
        }
        break;
      }
      case "surah": {
        const s = r.surah ?? num(tail(1));
        if (s) {
          openOverlay({ kind: "reader", surah: s, ayah: 1 });
        }
        break;
      }
      case "book": {
        const id = r.bookId ?? tail(1);
        if (id) {
          openOverlay({ kind: "book", bookId: id });
        }
        break;
      }
      case "chapter": {
        const bookId = r.bookId ?? tail(1);
        const chapterId = tail(1);
        if (bookId && chapterId) {
          openOverlay({ kind: "book", bookId, chapterId });
        }
        break;
      }
      case "topic": {
        const topicId = tail(1);
        if (topicId) {
          openOverlay({ kind: "topicAyahs", topicId });
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" role="dialog" aria-label="البحث">
      {/* ✦ الترويسة اللاصقة مع حقل البحث ✦ */}
      <div className="sticky top-0 z-20 bg-header-gradient text-white shadow-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-lg mx-auto px-3 h-14 flex items-center gap-1">
          <button
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={26} />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" aria-hidden="true" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              dir="rtl"
              type="search"
              placeholder="ابحث عن آية أو سورة أو كتاب…"
              aria-label="حقل البحث الشامل"
              className="w-full h-11 bg-white/95 text-ink rounded-full pr-10 pl-4 text-sm outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-white/60 transition-shadow"
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-28 pt-3">
        {/* ملاحظة العمل المحلي */}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1.5 w-fit mx-auto">
          <WifiOff size={13} aria-hidden="true" />
          يعمل البحث محليًا دون إنترنت على المحتوى المخزَّن
        </p>

        {/* الحالة الابتدائية */}
        {!trimmed && (
          <div className="flex flex-col items-center gap-4 py-20 text-center px-8 anim-fade-up">
            <span className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
              <Search size={44} className="text-primary/40" strokeWidth={1.4} aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/80">ابحث في كل المحتوى</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              اكتب كلمة من آية، أو اسم سورة، أو موضوعًا، أو عنوان كتاب — وستظهر النتائج مجمعة هنا.
            </p>
          </div>
        )}

        {/* جارٍ البحث */}
        {trimmed && isFetching && !data && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} aria-label="جارٍ البحث" />
          </div>
        )}

        {/* لا نتائج */}
        {trimmed && !isFetching && results.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-8 anim-fade-up">
            <span className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <SearchX size={34} className="text-primary/50" aria-hidden="true" />
            </span>
            <p className="font-bold text-ink/85">لا توجد نتائج</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              لم نجد ما يطابق «{tokens.raw}» — جرّب كلمة أقصر أو تحقق من الإملاء.
            </p>
          </div>
        )}

        {/* النتائج مجمعة */}
        {grouped.map((g) => {
          const Icon = g.icon;
          return (
            <section key={g.title} className="mt-6" aria-label={g.title}>
              <h2 className="flex items-center gap-2 font-bold text-sm text-primary mb-2.5 px-1">
                <Icon size={17} aria-hidden="true" />
                {g.title}
                <span className="text-[11px] font-medium text-muted-foreground">({toArabicDigits(g.items.length)})</span>
              </h2>
              <div className="space-y-2">
                {g.items.map((r, i) => (
                  <button
                    key={`${r.kind}:${r.ref}:${i}`}
                    onClick={() => openResult(r)}
                    className="w-full text-right bg-reading rounded-2xl p-3 hover:bg-accent active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={r.title}
                  >
                    <p className="font-bold text-sm text-ink/90">{r.title}</p>
                    {r.snippet && (
                      <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {highlightMatches(r.snippet, tokens.normalized)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
