"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ============================================================
   محرر الورد / البرنامج — شاشة منبثقة كاملة (onClose)
   ============================================================ */

export interface PlanEditorPrefill {
  name?: string;
  targetType: string;
  targetRef: string;
  totalPages?: number;
  kind?: string;
}

type TargetType = "quran_surah" | "quran_range" | "quran_pages" | "book";

const KIND_OPTIONS = [
  { value: "wird", label: "ورد يومي" },
  { value: "daily", label: "برنامج يومي" },
  { value: "ramadan", label: "برنامج رمضاني" },
] as const;

const TARGET_OPTIONS: { value: TargetType; label: string }[] = [
  { value: "quran_surah", label: "سورة كاملة" },
  { value: "quran_range", label: "نطاق آيات" },
  { value: "quran_pages", label: "عدد صفحات من المصحف" },
  { value: "book", label: "كتاب من المكتبة" },
];

const VALID_TARGETS: TargetType[] = ["quran_surah", "quran_range", "quran_pages", "book"];
const MUSHAF_PAGES = 604;

function parseRef(ref?: string): Record<string, unknown> {
  if (!ref) return {};
  try {
    const v = JSON.parse(ref);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-bold text-ink/80">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

const inputClass = "h-11 rounded-xl border-border/70 bg-white text-right";

export function PlanEditorScreen({ prefill, onClose }: { prefill?: PlanEditorPrefill; onClose: () => void }) {
  const queryClient = useQueryClient();
  const initialRef = useMemo(() => parseRef(prefill?.targetRef), [prefill]);

  const [kind, setKind] = useState(prefill?.kind ?? "wird");
  const [name, setName] = useState(prefill?.name ?? "");
  const [targetType, setTargetType] = useState<TargetType>(() => {
    if (typeof initialRef.pages === "number") return "quran_pages";
    if (typeof initialRef.surah === "number") return "quran_surah";
    if (typeof initialRef.fromSurah === "number") return "quran_range";
    if (typeof initialRef.bookId === "string") return "book";
    const t = prefill?.targetType;
    return t && VALID_TARGETS.includes(t as TargetType) ? (t as TargetType) : "quran_surah";
  });
  const [surahSel, setSurahSel] = useState(typeof initialRef.surah === "number" ? String(initialRef.surah) : "1");
  const [fromSurah, setFromSurah] = useState(initialRef.fromSurah != null ? String(initialRef.fromSurah) : "");
  const [fromAyah, setFromAyah] = useState(initialRef.fromAyah != null ? String(initialRef.fromAyah) : "");
  const [toSurah, setToSurah] = useState(initialRef.toSurah != null ? String(initialRef.toSurah) : "");
  const [toAyah, setToAyah] = useState(initialRef.toAyah != null ? String(initialRef.toAyah) : "");
  const [pages, setPages] = useState(typeof initialRef.pages === "number" ? String(initialRef.pages) : "");
  const [bookSel, setBookSel] = useState(typeof initialRef.bookId === "string" ? (initialRef.bookId as string) : "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [repeatKind, setRepeatKind] = useState("daily");

  const { data: surahsData, isLoading: surahsLoading } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs });
  const { data: booksData, isLoading: booksLoading } = useQuery({ queryKey: ["books"], queryFn: () => api.books() });
  const surahs = surahsData?.surahs ?? [];
  const books = booksData?.books ?? [];

  /** عدد صفحات السورة من فهرس السور: من صفحتها الأولى إلى ما قبل بداية السورة التالية */
  const surahPageCount = (n: number): number => {
    const idx = surahs.findIndex((s) => s.number === n);
    if (idx === -1) return 1;
    const start = surahs[idx].startPage;
    const end = idx < surahs.length - 1 ? surahs[idx + 1].startPage - 1 : MUSHAF_PAGES;
    return Math.max(1, end - start + 1);
  };

  const selectedBook = books.find((b) => b.id === bookSel);

  const computedTotalPages = useMemo(() => {
    if (targetType === "quran_pages") return Math.max(0, Number(pages) || 0);
    if (targetType === "quran_surah") return surahSel ? surahPageCount(Number(surahSel)) : 0;
    if (targetType === "book") return selectedBook?.chapterCount ?? 0;
    return 0;
  }, [targetType, pages, surahSel, bookSel, selectedBook, surahs]);

  const createMutation = useMutation({
    mutationFn: api.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(kind === "wird" ? "تم إنشاء الورد — بارك الله فيك" : "تم إنشاء البرنامج بنجاح");
      onClose();
    },
    onError: () => toast.error("تعذر إنشاء الورد — تحقق من البيانات وحاول مجددًا"),
  });

  const title = kind === "wird" ? "ورد جديد" : "برنامج جديد";

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("أدخل اسم الورد أولًا");
      return;
    }
    if (!startDate) {
      toast.error("حدد تاريخ البداية");
      return;
    }

    let refObj: Record<string, unknown> = {};
    let totalPages = 0;

    if (targetType === "quran_surah") {
      const n = Number(surahSel);
      if (!n) {
        toast.error("اختر السورة");
        return;
      }
      refObj = { surah: n };
      totalPages = surahs.length ? surahPageCount(n) : 1;
    } else if (targetType === "quran_range") {
      const fs = Number(fromSurah);
      const fa = Number(fromAyah);
      const ts = Number(toSurah);
      const ta = Number(toAyah);
      if (!fs || !fa || !ts || !ta) {
        toast.error("أكمل حقول نطاق الآيات (من/إلى سورة وآية)");
        return;
      }
      const max = surahs.length || 114;
      if (fs < 1 || ts < 1 || fs > max || ts > max) {
        toast.error("رقم السورة غير صحيح");
        return;
      }
      if (ts < fs || (ts === fs && ta < fa)) {
        toast.error("نهاية النطاق قبل بدايته — راجع القيم");
        return;
      }
      refObj = { fromSurah: fs, fromAyah: fa, toSurah: ts, toAyah: ta };
      // عدد الصفحات يُحسبه الخادم من بيانات الآيات
      totalPages = 0;
    } else if (targetType === "quran_pages") {
      const n = Number(pages);
      if (!n || n < 1) {
        toast.error("أدخل عدد صفحات صحيح");
        return;
      }
      refObj = { pages: n };
      totalPages = n;
    } else {
      if (!selectedBook) {
        toast.error("اختر الكتاب من المكتبة");
        return;
      }
      refObj = { bookId: selectedBook.id, chapterCount: selectedBook.chapterCount ?? 0 };
      totalPages = selectedBook.chapterCount ?? 0;
    }

    createMutation.mutate({
      kind,
      name: name.trim(),
      targetType,
      targetRef: JSON.stringify(refObj),
      totalPages,
      startDate,
      endDate: endDate || undefined,
      reminderTime: reminderTime || undefined,
      repeatKind,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg h-full flex flex-col">
        {/* الترويسة */}
        <header className="bg-header-gradient text-white shadow-md shrink-0">
          <div className="px-2 py-2 flex items-center gap-1">
            <button
              onClick={onClose}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="إغلاق"
            >
              <ChevronRight size={24} strokeWidth={2} />
            </button>
            <h1 className="font-ui font-bold text-lg flex-1">{title}</h1>
          </div>
        </header>

        {/* النموذج */}
        <div className="flex-1 overflow-y-auto nice-scrollbar px-4 py-5 space-y-5">
          <Field label="الاسم" htmlFor="plan-name">
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ورد سورة الكهف"
              className={inputClass}
            />
          </Field>

          <Field label="النوع" htmlFor="plan-kind">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="plan-kind" className={cn(inputClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="الهدف" htmlFor="plan-target">
            <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
              <SelectTrigger id="plan-target" className={cn(inputClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* سورة كاملة */}
          {targetType === "quran_surah" && (
            <Field
              label="السورة"
              htmlFor="plan-surah"
              hint={computedTotalPages > 0 ? `عدد الصفحات التقريبي: ${toArabicDigits(computedTotalPages)}` : undefined}
            >
              <Select value={surahSel} onValueChange={setSurahSel}>
                <SelectTrigger id="plan-surah" className={cn(inputClass, "w-full")}>
                  <SelectValue placeholder={surahsLoading ? "جارٍ التحميل…" : "اختر السورة"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {surahs.map((s) => (
                    <SelectItem key={s.number} value={String(s.number)}>
                      {`${toArabicDigits(s.number)}. ${s.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* نطاق آيات */}
          {targetType === "quran_range" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="من سورة" htmlFor="plan-from-surah">
                <Input
                  id="plan-from-surah"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={fromSurah}
                  onChange={(e) => setFromSurah(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="من آية" htmlFor="plan-from-ayah">
                <Input
                  id="plan-from-ayah"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={fromAyah}
                  onChange={(e) => setFromAyah(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="إلى سورة" htmlFor="plan-to-surah">
                <Input
                  id="plan-to-surah"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={toSurah}
                  onChange={(e) => setToSurah(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="إلى آية" htmlFor="plan-to-ayah">
                <Input
                  id="plan-to-ayah"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={toAyah}
                  onChange={(e) => setToAyah(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {/* عدد صفحات */}
          {targetType === "quran_pages" && (
            <Field label="عدد الصفحات" htmlFor="plan-pages" hint={`المصحف كاملًا ${toArabicDigits(MUSHAF_PAGES)} صفحة`}>
              <Input
                id="plan-pages"
                type="number"
                inputMode="numeric"
                min={1}
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="مثال: ٦٠٤"
                className={inputClass}
              />
            </Field>
          )}

          {/* كتاب من المكتبة */}
          {targetType === "book" && (
            <Field
              label="الكتاب"
              htmlFor="plan-book"
              hint={selectedBook?.chapterCount ? `عدد الفصول: ${toArabicDigits(selectedBook.chapterCount)}` : undefined}
            >
              <Select value={bookSel || undefined} onValueChange={setBookSel}>
                <SelectTrigger id="plan-book" className={cn(inputClass, "w-full")} disabled={booksLoading}>
                  <SelectValue placeholder={booksLoading ? "جارٍ التحميل…" : "اختر الكتاب"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                      {b.author ? ` — ${b.author}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!booksLoading && books.length === 0 && (
                <p className="text-xs text-muted-foreground pt-1">لا توجد كتب متاحة حاليًا</p>
              )}
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البداية" htmlFor="plan-start">
              <Input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="تاريخ النهاية" htmlFor="plan-end">
              <Input
                id="plan-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="التكرار" htmlFor="plan-repeat">
            <Select value={repeatKind} onValueChange={setRepeatKind}>
              <SelectTrigger id="plan-repeat" className={cn(inputClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">يومي</SelectItem>
                <SelectItem value="weekly">أسبوعي</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="وقت التذكير" htmlFor="plan-reminder" hint="التذكير يعمل أثناء فتح التطبيق">
            <Input
              id="plan-reminder"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className={inputClass}
            />
          </Field>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed pt-1">
            <Info size={13} className="shrink-0 mt-0.5 text-gold-deep" />
            الأوراد القرآنية تُسجَّل بالصفحات، وسوى ذلك يُسجَّل بالأيام المكتملة.
          </p>
        </div>

        {/* شريط الإجراءات الثابت */}
        <footer
          className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur px-4 py-3 flex gap-2"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-2"
            aria-label={title === "ورد جديد" ? "إنشاء الورد" : "إنشاء البرنامج"}
          >
            {createMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : null}
            {createMutation.isPending ? "جارٍ الإنشاء…" : "إنشاء"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 h-12 rounded-xl"
          >
            إلغاء
          </Button>
        </footer>
      </div>
    </div>
  );
}
