"use client";

/**
 * overlay «لوحة الإدارة» — محمي بتسجيل دخول (جلسة كوكي httpOnly).
 * ثمانية تبويبات:
 * نظرة عامة (سير النشر المرئي + إجراءات سريعة) / الكتب (فلتر + تمييز) /
 * الأقسام (إضافة وتعديل وحذف الفارغ) / المواضيع (إنشاء + إدارة آيات) /
 * المقرئون (إضافة وتعديل وافتراضي) / الحزم (تحديث) / البيانات (نسخ واستعادة وتصدير) / السجل (فلاتر).
 * قاعدة صارمة: النص القرآني المعتمد لا يُعدَّل من هنا إطلاقًا.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { toast } from "sonner";
import {
  ChevronRight,
  Plus,
  Pencil,
  List,
  Trash2,
  ArrowLeftCircle,
  ShieldAlert,
  BookOpen,
  Book,
  ScrollText,
  Mic,
  Heart,
  Star,
  Sparkles,
  MoonStar,
  Users,
  FileText,
  PenLine,
  Headphones,
  Quote,
  GraduationCap,
  Feather,
  Landmark,
  Loader2,
  LockKeyhole,
  LogOut,
  KeyRound,
  Package,
  Database,
  Download,
  Upload,
  RefreshCw,
  Search,
  Save,
  Layers,
  type LucideIcon,
} from "lucide-react";

import {
  api,
  type AdminPackage,
  type AdminReciter,
  type AuditEntry,
  type BookItem,
  type ChapterItem,
  type LibrarySectionItem,
  type TopicItem,
} from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { AdminLoginScreen } from "@/components/settings/admin-login";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ============================================================
   أنواع ومساعدات
   ============================================================ */

type AdminOverview = {
  stats: Record<string, number> & { byStatus?: Record<string, number> };
  audit: AuditEntry[];
};

type AdminTopic = TopicItem & { isPublished: boolean };
type AdminSection = LibrarySectionItem & { isActive: boolean };

const FLOW = ["draft", "review", "approved", "published", "archived"] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  review: "مراجعة",
  approved: "معتمد",
  published: "منشور",
  archived: "مؤرشف",
};

const NEXT_ACTION: Record<string, string | null> = {
  draft: "إرسال للمراجعة",
  review: "اعتماد",
  approved: "نشر",
  published: "أرشفة",
  archived: null,
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  review: "bg-amber-500",
  approved: "bg-teal-500",
  published: "bg-emerald-500",
  archived: "bg-secondary-foreground/40",
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "draft"
      ? "bg-muted text-muted-foreground border border-border"
      : status === "review"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border-transparent"
        : status === "approved"
          ? "bg-teal-soft text-teal-dark border-transparent"
          : status === "published"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-transparent"
            : "bg-secondary text-secondary-foreground/70 border-transparent";
  return <Badge className={cn(cls, "shrink-0")}>{STATUS_LABEL[status] ?? status}</Badge>;
}

const ACTION_META: Record<string, { label: string; cls: string }> = {
  create: { label: "إنشاء", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  update: { label: "تعديل", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
  publish: { label: "نشر", cls: "bg-teal-soft text-teal-dark" },
  delete: { label: "حذف", cls: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400" },
};

function fmtTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy، HH:mm", { locale: arSA });
  } catch {
    return "";
  }
}

/** تنزيل JSON كملف محلي */
function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** خريطة أيقونات الأقسام (أسماء lucide نصية) مع بديل آمن */
const SECTION_ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  book: Book,
  "scroll-text": ScrollText,
  mic: Mic,
  heart: Heart,
  star: Star,
  sparkles: Sparkles,
  "moon-star": MoonStar,
  moon: MoonStar,
  users: Users,
  "file-text": FileText,
  pen: PenLine,
  headphones: Headphones,
  quote: Quote,
  "graduation-cap": GraduationCap,
  feather: Feather,
  landmark: Landmark,
};

function SectionIcon({ name }: { name: string }) {
  const Icon = SECTION_ICONS[name] ?? BookOpen;
  return <Icon size={18} strokeWidth={1.9} aria-hidden="true" />;
}

function OverlayHeader({ title, onClose, user }: { title: string; onClose: () => void; user?: { displayName: string; role: string } | null }) {
  const queryClient = useQueryClient();
  const [pwOpen, setPwOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = useMutation({
    mutationFn: () => api.admin.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      toast.success("تم تسجيل الخروج");
    },
  });

  return (
    <header className="sticky top-0 z-20 bg-header-gradient text-white shadow-md">
      <div className="max-w-lg mx-auto h-14 px-2 flex items-center justify-between">
        <button
          onClick={onClose}
          aria-label="رجوع"
          className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronRight size={24} strokeWidth={1.8} />
        </button>
        <h1 className="font-ui font-bold text-lg">{title}</h1>
        {user ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`قائمة الحساب: ${user.displayName}`}
              aria-expanded={menuOpen}
              className="h-9 px-2.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center gap-1.5"
            >
              <span className="text-[12px] font-bold max-w-20 truncate">{user.displayName}</span>
              <KeyRound size={14} aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                {/* غطاء لإغلاق القائمة */}
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="إغلاق القائمة"
                  onClick={() => setMenuOpen(false)}
                  tabIndex={-1}
                />
                <div
                  role="menu"
                  className="absolute top-11 left-0 z-20 w-44 bg-card text-ink rounded-2xl shadow-xl border border-border/60 overflow-hidden anim-fade-up"
                >
                  <div className="px-3 py-2.5 bg-secondary/50">
                    <p className="text-[13px] font-bold truncate">{user.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {user.role === "owner" ? "مالك" : user.role === "editor" ? "محرر" : "مراجع"}
                    </p>
                  </div>
                  <button
                    role="menuitem"
                    className="w-full px-3 py-2.5 text-[13px] font-medium text-right hover:bg-secondary/60 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      setPwOpen(true);
                    }}
                  >
                    <KeyRound size={15} aria-hidden="true" />
                    تغيير كلمة المرور
                  </button>
                  <button
                    role="menuitem"
                    className="w-full px-3 py-2.5 text-[13px] font-medium text-right text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      logout.mutate();
                    }}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    تسجيل الخروج
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="w-11 shrink-0" aria-hidden="true" />
        )}
      </div>
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </header>
  );
}

/* ============================================================
   حوار تغيير كلمة المرور
   ============================================================ */

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => api.admin.changePassword(current, next),
    onSuccess: () => {
      toast.success("غيّرت كلمة المرور بنجاح");
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      onOpenChange(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = () => {
    setError(null);
    if (next.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (next !== confirm) {
      setError("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    change.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>تغيير كلمة المرور</DialogTitle>
          <DialogDescription>يُوصى بتغيير الافتراضي فور أول دخول.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">كلمة المرور الحالية</Label>
            <Input
              id="pw-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="h-11"
              dir="ltr"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-next">كلمة المرور الجديدة</Label>
            <Input
              id="pw-next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="h-11"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">تأكيد كلمة المرور</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs font-bold text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            إلغاء
          </Button>
          <Button onClick={submit} disabled={change.isPending} className="h-11 min-w-24 bg-header-gradient hover:opacity-95">
            {change.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   تبويب: نظرة عامة — سير النشر + إحصاءات + إجراءات سريعة
   ============================================================ */

const STAT_ITEMS: { key: string; label: string }[] = [
  { key: "surahsCount", label: "السور" },
  { key: "ayahsCount", label: "الآيات" },
  { key: "tafsirCount", label: "آيات التفسير" },
  { key: "recitersCount", label: "المقرئون" },
  { key: "booksCount", label: "الكتب" },
  { key: "chaptersCount", label: "الفصول" },
  { key: "sectionsCount", label: "الأقسام" },
  { key: "topicsCount", label: "المواضيع" },
  { key: "packagesCount", label: "حزم مثبتة" },
  { key: "plansCount", label: "الأوراد" },
  { key: "favoritesCount", label: "المفضلة" },
  { key: "pendingCount", label: "بانتظار اعتماد" },
];

function AuditRow({ a }: { a: AuditEntry }) {
  const meta = ACTION_META[a.action] ?? ACTION_META.update;
  return (
    <div className="bg-card rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
      <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0", meta.cls)}>{meta.label}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{a.details ?? a.entity}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {a.entity} · {a.actor} · {fmtTime(a.createdAt)}
        </p>
      </div>
    </div>
  );
}

function PublishPipeline({ byStatus }: { byStatus: Record<string, number> }) {
  const total = FLOW.reduce((s, k) => s + (byStatus[k] ?? 0), 0);
  return (
    <section aria-label="سير النشر" className="bg-card rounded-2xl p-4 shadow-sm anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-ink text-sm">سير النشر</h3>
        <p className="text-[11px] text-muted-foreground">
          {toArabicDigits(total)} كتابًا في المسار
        </p>
      </div>
      {/* شريط الحالات */}
      <div className="flex h-3 rounded-full overflow-hidden bg-secondary gap-px" role="img" aria-label="توزيع حالات الكتب">
        {FLOW.map((k) => {
          const c = byStatus[k] ?? 0;
          if (!c) return null;
          return <span key={k} className={cn("h-full", STATUS_DOT[k])} style={{ width: `${(c / Math.max(total, 1)) * 100}%` }} />;
        })}
      </div>
      <div className="grid grid-cols-5 gap-1 mt-3">
        {FLOW.map((k) => (
          <div key={k} className="text-center">
            <span className={cn("inline-block w-2 h-2 rounded-full mb-1", STATUS_DOT[k])} aria-hidden="true" />
            <p className="text-base font-bold text-ink font-ui leading-none">{toArabicDigits(byStatus[k] ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{STATUS_LABEL[k]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverviewTab({ onJump }: { onJump: (tab: string) => void }) {
  const { data, isLoading } = useQuery<AdminOverview>({ queryKey: ["admin-overview"], queryFn: api.admin.overview });
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3" aria-label="جارٍ التحميل">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }
  const stats = data?.stats ?? {};
  const byStatus = stats.byStatus ?? {};
  const audit = data?.audit ?? [];
  const pending = (byStatus.draft ?? 0) + (byStatus.review ?? 0) + (byStatus.approved ?? 0);

  const QUICK: { tab: string; label: string; icon: LucideIcon }[] = [
    { tab: "books", label: "الكتب", icon: Book },
    { tab: "sections", label: "الأقسام", icon: Layers },
    { tab: "topics", label: "المواضيع", icon: Star },
    { tab: "reciters", label: "المقرئون", icon: Mic },
    { tab: "packages", label: "الحزم", icon: Package },
    { tab: "data", label: "النسخ الاحتياطي", icon: Database },
  ];

  return (
    <div className="space-y-4">
      {pending > 0 && (
        <div
          role="status"
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 rounded-2xl p-3.5 flex items-center gap-2.5"
        >
          <ClockIcon aria-hidden="true" />
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex-1 leading-relaxed">
            {toArabicDigits(pending)} كتابًا بانتظار الإجراء في سير النشر
          </p>
          <Button size="sm" className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white" onClick={() => onJump("books")}>
            متابعة
          </Button>
        </div>
      )}

      <PublishPipeline byStatus={byStatus} />

      {/* إجراءات سريعة */}
      <section aria-label="إجراءات سريعة">
        <h3 className="font-bold text-ink text-sm mb-2 px-1">إجراءات سريعة</h3>
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map((q) => (
            <button
              key={q.tab}
              onClick={() => onJump(q.tab)}
              className="bg-card rounded-2xl p-3 shadow-sm flex flex-col items-center gap-1.5 hover:shadow-md hover:-translate-y-0.5 transition-all anim-fade-up"
            >
              <span className="w-9 h-9 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center">
                <q.icon size={17} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="text-[11px] font-bold text-ink text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {STAT_ITEMS.map((s) => (
          <div key={s.key} className="bg-card rounded-2xl p-4 text-center shadow-sm anim-fade-up">
            <p className="text-2xl font-bold text-teal-dark font-ui">{toArabicDigits(stats[s.key] ?? 0)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <section aria-label="آخر السجلات">
        <h3 className="font-bold text-ink text-sm mb-2 px-1">آخر السجلات</h3>
        {audit.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">لا سجلات بعد</p>
        ) : (
          <div className="space-y-2">
            {audit.slice(0, 10).map((a) => (
              <AuditRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-5 h-5 shrink-0 text-amber-600", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ============================================================
   تبويب: الكتب — سير العمل والفصول + فلتر الحالة + التمييز
   ============================================================ */

/** حوار إنشاء/تعديل كتاب */
function BookFormDialog({
  open,
  onOpenChange,
  book,
  sections,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  book?: BookItem;
  sections: LibrarySectionItem[];
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(book);
  const [title, setTitle] = useState(book?.title ?? "");
  const [sectionId, setSectionId] = useState(book?.sectionId ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [coverStyle, setCoverStyle] = useState(book?.coverStyle ?? "teal");
  const [sourceName, setSourceName] = useState(book?.sourceName ?? "");
  const [licenseNote, setLicenseNote] = useState(book?.licenseNote ?? "");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        sectionId,
        author: author.trim() || null,
        description: description.trim() || null,
        coverStyle,
        sourceName: sourceName.trim() || null,
        licenseNote: licenseNote.trim() || null,
      };
      return isEdit && book ? api.admin.updateBook(book.id, payload) : api.admin.createBook(payload);
    },
    onSuccess: (_res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      toast.success(isEdit ? `حُدّث الكتاب «${title.trim()}»` : `أُنشئ الكتاب «${title.trim()}» كمسودة`);
      onOpenChange(false);
    },
    onError: () => toast.error("تعذر حفظ الكتاب — تحقق من البيانات"),
  });

  const submit = () => {
    if (!title.trim()) {
      toast.error("عنوان الكتاب مطلوب");
      return;
    }
    if (!sectionId) {
      toast.error("اختر قسم الكتاب");
      return;
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-y-auto nice-scrollbar">
        <DialogHeader className="text-right">
          <DialogTitle>{isEdit ? "تعديل الكتاب" : "إضافة كتاب"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "عدّل بيانات الكتاب ثم احفظ." : "يُضاف الكتاب كمسودة ثم يمر بسير الاعتماد."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="book-title">عنوان الكتاب *</Label>
            <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label>القسم *</Label>
            <Select value={sectionId} onValueChange={setSectionId} dir="rtl">
              <SelectTrigger className="w-full h-11" aria-label="قسم الكتاب">
                <SelectValue placeholder="اختر القسم" />
              </SelectTrigger>
              <SelectContent>
                {sections.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">لا أقسام — أنشئ قسمًا أولًا</div>}
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-author">المؤلف</Label>
            <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-desc">الوصف</Label>
            <Textarea id="book-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>نمط الغلاف</Label>
            <Select value={coverStyle} onValueChange={setCoverStyle} dir="rtl">
              <SelectTrigger className="w-full h-11" aria-label="نمط الغلاف">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teal">فيروزي</SelectItem>
                <SelectItem value="sand">رملي</SelectItem>
                <SelectItem value="night">ليلي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-source">المصدر</Label>
            <Input
              id="book-source"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="المصدر الموثق للنص"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-license">الحقوق</Label>
            <Input
              id="book-license"
              value={licenseNote}
              onChange={(e) => setLicenseNote(e.target.value)}
              placeholder="ملاحظة حقوق الاستخدام"
              className="h-11"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            إلغاء
          </Button>
          <Button onClick={submit} disabled={save.isPending} className="h-11 min-w-24 bg-header-gradient hover:opacity-95">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** حوار إدارة فصول كتاب */
function ChaptersDialog({ book, onOpenChange }: { book: BookItem; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-chapters", book.id],
    queryFn: () => api.admin.chapters(book.id),
  });
  const chapters = data?.chapters ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-chapters", book.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-books"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const create = useMutation({
    mutationFn: () => api.admin.createChapter({ bookId: book.id, title: newTitle.trim(), content: newContent }),
    onSuccess: () => {
      invalidate();
      setNewTitle("");
      setNewContent("");
      toast.success(`أُضيف الفصل «${newTitle.trim()}»`);
    },
    onError: () => toast.error("تعذر إضافة الفصل — تأكد من العنوان والمحتوى"),
  });

  const update = useMutation({
    mutationFn: (c: { id: string; title: string; content: string }) =>
      api.admin.updateChapter(c.id, { title: c.title, content: c.content }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("حُفظ تعديل الفصل");
    },
    onError: () => toast.error("تعذر حفظ الفصل"),
  });

  const remove = useMutation({
    mutationFn: (c: ChapterItem) => api.admin.deleteChapter(c.id),
    onSuccess: (_r, c) => {
      invalidate();
      toast.success(`حُذف الفصل «${c.title}»`);
    },
    onError: () => toast.error("تعذر حذف الفصل"),
  });

  const startEdit = (c: ChapterItem) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditContent(c.content);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-right">
          <DialogTitle>فصول: {book.title}</DialogTitle>
          <DialogDescription>{toArabicDigits(chapters.length)} فصلًا — أضف أو عدّل محتوى الفصول</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto nice-scrollbar space-y-2.5 py-1">
          {isLoading ? (
            <div className="space-y-2" aria-label="جارٍ تحميل الفصول">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : chapters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">لا فصول بعد — أضف الفصل الأول</p>
          ) : (
            chapters.map((c) => (
              <div key={c.id} className="bg-secondary/50 rounded-xl p-3 space-y-2">
                {editingId === c.id ? (
                  <>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-10 bg-card" aria-label="عنوان الفصل" />
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} className="bg-card text-sm" aria-label="محتوى الفصل" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => setEditingId(null)}>
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 bg-header-gradient hover:opacity-95"
                        onClick={() => update.mutate({ id: c.id, title: editTitle.trim() || c.title, content: editContent })}
                        disabled={update.isPending}
                      >
                        حفظ
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {toArabicDigits(c.number)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => startEdit(c)} aria-label={`تعديل فصل ${c.title}`}>
                        <Pencil size={13} />
                        تعديل
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-destructive border-destructive/30" aria-label={`حذف فصل ${c.title}`}>
                            <Trash2 size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl" className="max-w-sm">
                          <AlertDialogHeader className="text-right">
                            <AlertDialogTitle>حذف الفصل «{c.title}»؟</AlertDialogTitle>
                            <AlertDialogDescription>لا يمكن التراجع عن حذف الفصل.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="h-11 bg-destructive hover:bg-destructive/90"
                              onClick={() => remove.mutate(c)}
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* إضافة فصل */}
        <div className="border-t border-border pt-3 mt-1 space-y-2">
          <p className="text-xs font-bold text-ink">إضافة فصل جديد</p>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="عنوان الفصل"
            className="h-10"
            aria-label="عنوان الفصل الجديد"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="محتوى الفصل…"
            rows={3}
            aria-label="محتوى الفصل الجديد"
          />
          <Button
            onClick={() => {
              if (!newTitle.trim() || !newContent.trim()) {
                toast.error("أدخل عنوان الفصل ومحتواه");
                return;
              }
              create.mutate();
            }}
            disabled={create.isPending}
            className="w-full h-10 rounded-xl bg-header-gradient hover:opacity-95 font-bold gap-1.5"
          >
            {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            إضافة فصل
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookRow({ book, onEdit, onChapters }: { book: BookItem; onEdit: () => void; onChapters: () => void }) {
  const queryClient = useQueryClient();
  const nextStatus = NEXT_ACTION[book.status];

  const advance = useMutation({
    mutationFn: () => {
      const idx = FLOW.indexOf(book.status as (typeof FLOW)[number]);
      return api.admin.setBookStatus(book.id, FLOW[Math.min(idx + 1, FLOW.length - 1)]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      const next = STATUS_LABEL[FLOW[FLOW.indexOf(book.status as (typeof FLOW)[number]) + 1]] ?? "";
      toast.success(`«${book.title}» ← ${next}`);
    },
    onError: () => toast.error("تعذر تغيير حالة الكتاب"),
  });

  const toggleFeatured = useMutation({
    mutationFn: () => api.admin.updateBook(book.id, { isFeatured: !book.isFeatured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      toast.success(book.isFeatured ? `أُزيل التمييز من «${book.title}»` : `عُلّم «${book.title}» كمميز`);
    },
    onError: () => toast.error("تعذر تحديث التمييز"),
  });

  const remove = useMutation({
    mutationFn: () => api.admin.deleteBook(book.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success(`حُذف الكتاب «${book.title}»`);
    },
    onError: () => toast.error("تعذر حذف الكتاب"),
  });

  return (
    <div className="bg-card rounded-2xl p-4 space-y-3 shadow-sm anim-fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-ink text-[15px] truncate">{book.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {book.sectionTitle ?? "—"} · {toArabicDigits(book.chapterCount ?? 0)} فصل
            {book.author ? ` · ${book.author}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => toggleFeatured.mutate()}
            disabled={toggleFeatured.isPending}
            aria-label={book.isFeatured ? `إزالة التمييز عن ${book.title}` : `تمييز ${book.title}`}
            aria-pressed={book.isFeatured}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              book.isFeatured ? "text-amber-500 bg-amber-100 dark:bg-amber-950/50" : "text-muted-foreground/50 hover:text-amber-500"
            )}
          >
            <Star size={16} fill={book.isFeatured ? "currentColor" : "none"} />
          </button>
          <StatusBadge status={book.status} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {nextStatus && (
          <Button
            size="sm"
            onClick={() => advance.mutate()}
            disabled={advance.isPending}
            className="h-9 rounded-lg bg-header-gradient hover:opacity-95 gap-1.5"
            aria-label={`${nextStatus}: ${book.title}`}
          >
            {advance.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftCircle size={14} />}
            {nextStatus}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={onEdit} aria-label={`تعديل ${book.title}`}>
          <Pencil size={14} />
          تعديل
        </Button>
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={onChapters} aria-label={`فصول ${book.title}`}>
          <List size={14} />
          الفصول
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-lg text-destructive border-destructive/30 mr-auto"
              aria-label={`حذف ${book.title}`}
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl" className="max-w-sm">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle>حذف الكتاب «{book.title}»؟</AlertDialogTitle>
              <AlertDialogDescription>سيُحذف الكتاب مع جميع فصوله ولا يمكن التراجع.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                className="h-11 bg-destructive hover:bg-destructive/90"
                onClick={() => remove.mutate()}
              >
                حذف نهائي
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function BooksTab() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editBook, setEditBook] = useState<BookItem | null>(null);
  const [chaptersBook, setChaptersBook] = useState<BookItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: overviewData } = useQuery<AdminOverview>({ queryKey: ["admin-overview"], queryFn: api.admin.overview });
  const byStatus = overviewData?.stats.byStatus ?? {};

  const { data, isLoading } = useQuery({
    queryKey: ["admin-books", statusFilter],
    queryFn: () => api.admin.books(statusFilter === "all" ? undefined : statusFilter),
  });
  const { data: sectionsData } = useQuery({ queryKey: ["admin-sections"], queryFn: api.admin.sections });
  const sections = sectionsData?.sections ?? [];
  const books = data?.books ?? [];

  const FILTERS: { value: string; label: string }[] = [
    { value: "all", label: "الكل" },
    ...FLOW.map((f) => ({ value: f, label: STATUS_LABEL[f] })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">سير النشر: مسودة ← مراجعة ← اعتماد ← نشر ← أرشفة</p>
        <Button onClick={() => setAddOpen(true)} className="h-10 rounded-xl bg-header-gradient hover:opacity-95 font-bold gap-1.5 shrink-0">
          <Plus size={16} />
          إضافة كتاب
        </Button>
      </div>

      {/* فلتر الحالة */}
      <div className="flex gap-1.5 overflow-x-auto nice-scrollbar pb-1" role="tablist" aria-label="فلترة حسب الحالة">
        {FILTERS.map((f) => {
          const count = f.value === "all" ? FLOW.reduce((s, k) => s + (byStatus[k] ?? 0), 0) : byStatus[f.value] ?? 0;
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "shrink-0 h-8 px-3 rounded-full text-[12px] font-bold transition-colors flex items-center gap-1.5",
                active ? "bg-primary text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              {f.label}
              <span className={cn("text-[10px] rounded-full px-1.5", active ? "bg-white/25" : "bg-background/70")}>
                {toArabicDigits(count)}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="جارٍ تحميل الكتب">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">لا كتب في هذه الحالة</p>
      ) : (
        books.map((b) => (
          <BookRow
            key={b.id}
            book={b}
            onEdit={() => setEditBook(b)}
            onChapters={() => setChaptersBook(b)}
          />
        ))
      )}

      {addOpen && (
        <BookFormDialog open onOpenChange={setAddOpen} sections={sections} />
      )}
      {editBook && (
        <BookFormDialog key={editBook.id} open onOpenChange={(v) => !v && setEditBook(null)} book={editBook} sections={sections} />
      )}
      {chaptersBook && (
        <ChaptersDialog key={chaptersBook.id} book={chaptersBook} onOpenChange={(v) => !v && setChaptersBook(null)} />
      )}
    </div>
  );
}

/* ============================================================
   تبويب: الأقسام — محرك محتوى مرن (إضافة/تعديل/حذف الفارغ)
   ============================================================ */

/** حوار إضافة/تعديل قسم */
function SectionFormDialog({
  open,
  onOpenChange,
  section,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  section?: AdminSection;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(section);
  const [title, setTitle] = useState(section?.title ?? "");
  const [description, setDescription] = useState(section?.description ?? "");
  const [icon, setIcon] = useState(section?.icon ?? "book-open");
  const [color, setColor] = useState(section?.color ?? "teal");

  const save = useMutation({
    mutationFn: () => {
      const payload = { title: title.trim(), description: description.trim() || undefined, icon, color };
      return isEdit && section ? api.admin.updateSection(section.id, payload) : api.admin.createSection(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(isEdit ? `حُدّث قسم «${title.trim()}»` : `أُضيف قسم «${title.trim()}» — يظهر الآن في المكتبة`);
      onOpenChange(false);
    },
    onError: () => toast.error("تعذر حفظ القسم"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>{isEdit ? "تعديل القسم" : "إضافة قسم"}</DialogTitle>
          <DialogDescription>
            الأقسام الجديدة تظهر فورًا في المكتبة — محرك محتوى مرن غير مقيد بأسماء ثابتة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="sec-title">عنوان القسم *</Label>
            <Input id="sec-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-desc">الوصف</Label>
            <Textarea id="sec-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-icon">الأيقونة (اسم lucide)</Label>
            <Input
              id="sec-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="book-open / scroll-text / mic…"
              className="h-11"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label>اللون</Label>
            <Select value={color} onValueChange={setColor} dir="rtl">
              <SelectTrigger className="w-full h-11" aria-label="لون القسم">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teal">فيروزي</SelectItem>
                <SelectItem value="sand">رملي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            إلغاء
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) {
                toast.error("عنوان القسم مطلوب");
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending}
            className="h-11 min-w-24 bg-header-gradient hover:opacity-95"
          >
            {save.isPending ? "جارٍ الحفظ…" : isEdit ? "حفظ" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionsTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editSection, setEditSection] = useState<AdminSection | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-sections"], queryFn: api.admin.sections });
  const sections = (data?.sections ?? []) as AdminSection[];

  const toggleActive = useMutation({
    mutationFn: (s: { id: string; isActive: boolean; title: string }) =>
      api.admin.updateSection(s.id, { isActive: s.isActive }),
    onSuccess: (_r, s) => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success(s.isActive ? `فُعّل قسم «${s.title}»` : `أُوقف قسم «${s.title}» مؤقتًا`);
    },
    onError: () => toast.error("تعذر تحديث القسم"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.admin.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("حُذف القسم الفارغ");
    },
    onError: (e: Error) => toast.error(e.message.includes("409") ? "لا يمكن حذف قسم يحوي كتبًا" : "تعذر حذف القسم"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">إيقاف القسم يخفيه من المكتبة — والحذف متاح للأقسام الفارغة فقط</p>
        <Button onClick={() => setFormOpen(true)} className="h-10 rounded-xl bg-header-gradient hover:opacity-95 font-bold gap-1.5 shrink-0">
          <Plus size={16} />
          إضافة قسم
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="جارٍ تحميل الأقسام">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.id} className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm anim-fade-up">
              <span
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  s.color === "sand" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : "bg-teal-soft text-teal-dark"
                )}
              >
                <SectionIcon name={s.icon} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-[15px] truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {toArabicDigits(s.bookCount ?? 0)} كتاب{s.description ? ` · ${s.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-9 h-9 rounded-xl text-teal-dark border-teal-soft hover:bg-teal-soft/50"
                  onClick={() => setEditSection(s)}
                  aria-label={`تعديل قسم ${s.title}`}
                >
                  <Pencil size={15} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-9 h-9 rounded-xl text-destructive border-destructive/30"
                      disabled={(s.bookCount ?? 0) > 0}
                      aria-label={`حذف قسم ${s.title}`}
                      title={(s.bookCount ?? 0) > 0 ? "لا يُحذف إلا بعد إفراغه من الكتب" : undefined}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl" className="max-w-sm">
                    <AlertDialogHeader className="text-right">
                      <AlertDialogTitle>حذف قسم «{s.title}»؟</AlertDialogTitle>
                      <AlertDialogDescription>الحذف متاح للأقسام الفارغة من الكتب فقط.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
                      <AlertDialogAction className="h-11 bg-destructive hover:bg-destructive/90" onClick={() => remove.mutate(s.id)}>
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Switch
                  checked={s.isActive}
                  onCheckedChange={(v) => toggleActive.mutate({ id: s.id, isActive: v, title: s.title })}
                  disabled={toggleActive.isPending}
                  aria-label={`${s.isActive ? "إيقاف" : "تفعيل"} قسم ${s.title}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <SectionFormDialog open onOpenChange={setFormOpen} />}
      {editSection && (
        <SectionFormDialog key={editSection.id} open onOpenChange={(v) => !v && setEditSection(null)} section={editSection} />
      )}
    </div>
  );
}

/* ============================================================
   تبويب: المواضيع — إنشاء + وصف + نشر + إدارة الآيات
   ============================================================ */

function CreateTopicDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => api.admin.createTopic({ title: title.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(`أُنشئ موضوع «${title.trim()}» — أضف آياته ثم انشره`);
      setTitle("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>موضوع جديد</DialogTitle>
          <DialogDescription>
            يُنشأ غير منشور — أضف آياته من المُصحف الموثق ثم فعّل النشر.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="topic-title">عنوان الموضوع *</Label>
            <Input id="topic-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" placeholder="مثال: الصبر والثبات" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-desc">الوصف</Label>
            <Textarea id="topic-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            إلغاء
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) {
                toast.error("عنوان الموضوع مطلوب");
                return;
              }
              create.mutate();
            }}
            disabled={create.isPending}
            className="h-11 min-w-24 bg-header-gradient hover:opacity-95"
          >
            {create.isPending ? "جارٍ الإنشاء…" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** حوار إدارة آيات موضوع — إضافة بالتحقق من المصحف وحذف بالمعرف */
function TopicAyahsDialog({ topicId, onOpenChange }: { topicId: string; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [surah, setSurah] = useState("");
  const [ayah, setAyah] = useState("");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-topic", topicId],
    queryFn: () => api.admin.topic(topicId),
  });
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs });
  const surahs = surahsData?.surahs ?? [];
  const selected = surahs.find((s) => String(s.number) === surah);
  const topic = data?.topic;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-topic", topicId] });
    queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
    queryClient.invalidateQueries({ queryKey: ["topics"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const add = useMutation({
    mutationFn: () =>
      api.admin.updateTopic(topicId, {
        addAyahs: [{ surah: Number(surah), ayah: Number(ayah), note: note.trim() || undefined }],
      }),
    onSuccess: () => {
      invalidate();
      setAyah("");
      setNote("");
      toast.success(`أُضيفت الآية ${toArabicDigits(Number(ayah))} من ${selected?.name ?? ""}`);
    },
    onError: (e: Error) => toast.error(e.message || "تعذر إضافة الآية"),
  });

  const remove = useMutation({
    mutationFn: (ayahId: string) => api.admin.updateTopic(topicId, { removeAyahIds: [ayahId] }),
    onSuccess: () => {
      invalidate();
      toast.success("حُذفت الآية من الموضوع");
    },
    onError: () => toast.error("تعذر حذف الآية"),
  });

  const submitAdd = () => {
    const ayahNum = Number(ayah);
    if (!surah) {
      toast.error("اختر السورة");
      return;
    }
    if (!ayahNum || ayahNum < 1) {
      toast.error("رقم الآية غير صالح");
      return;
    }
    if (selected && ayahNum > selected.ayahCount) {
      toast.error(`${selected.name} عدد آياتها ${toArabicDigits(selected.ayahCount)}`);
      return;
    }
    add.mutate();
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-right">
          <DialogTitle>آيات: {topic?.title ?? "…"}</DialogTitle>
          <DialogDescription>
            تُتحقق الآيات آليًا من المصحف المعتمد — لا يُقبل رقم غير صحيح.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto nice-scrollbar space-y-2 py-1">
          {isLoading ? (
            <div className="space-y-2" aria-label="جارٍ تحميل الآيات">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !topic?.ayahs?.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">لا آيات بعد — أضف أول آية</p>
          ) : (
            topic.ayahs.map((a) => (
              <div key={a.id} className="bg-secondary/50 rounded-xl p-3 flex items-start gap-2">
                <span className="rounded-md bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-1 shrink-0 font-ui">
                  {toArabicDigits(a.surah)}:{toArabicDigits(a.ayah)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink leading-relaxed line-clamp-2 font-quran">{a.text}</p>
                  {a.note && <p className="text-[11px] text-muted-foreground mt-1">{a.note}</p>}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-destructive border-destructive/30 shrink-0"
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                  aria-label={`حذف الآية ${a.ayah} من السورة ${a.surah}`}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* إضافة آية */}
        <div className="border-t border-border pt-3 mt-1 space-y-2">
          <p className="text-xs font-bold text-ink">إضافة آية</p>
          <div className="grid grid-cols-2 gap-2">
            <Select value={surah} onValueChange={(v) => { setSurah(v); setAyah(""); }} dir="rtl">
              <SelectTrigger className="w-full h-10" aria-label="اختيار السورة">
                <SelectValue placeholder="السورة" />
              </SelectTrigger>
              <SelectContent className="max-h-60 nice-scrollbar">
                {surahs.map((s) => (
                  <SelectItem key={s.number} value={String(s.number)}>
                    {toArabicDigits(s.number)}. {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={ayah}
              onChange={(e) => setAyah(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={selected ? `الآية (١–${toArabicDigits(selected.ayahCount)})` : "رقم الآية"}
              className="h-10"
              inputMode="numeric"
              aria-label="رقم الآية"
            />
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة اختيارية على الآية"
            className="h-10"
            aria-label="ملاحظة الآية"
          />
          <Button
            onClick={submitAdd}
            disabled={add.isPending}
            className="w-full h-10 rounded-xl bg-header-gradient hover:opacity-95 font-bold gap-1.5"
          >
            {add.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            إضافة آية للموضوع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTopicDescDialog({
  topic,
  onOpenChange,
}: {
  topic: AdminTopic;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [desc, setDesc] = useState(topic.description ?? "");

  const save = useMutation({
    mutationFn: () => api.admin.updateTopic(topic.id, { description: desc.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast.success("حُفظ وصف الموضوع");
      onOpenChange(false);
    },
    onError: () => toast.error("تعذر حفظ الوصف"),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>وصف الموضوع: {topic.title}</DialogTitle>
          <DialogDescription>يظهر الوصف في الفهرس الموضوعي.</DialogDescription>
        </DialogHeader>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} aria-label="وصف الموضوع" />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            إلغاء
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="h-11 min-w-24 bg-header-gradient hover:opacity-95">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopicsTab() {
  const queryClient = useQueryClient();
  const [editTopic, setEditTopic] = useState<AdminTopic | null>(null);
  const [ayahsTopicId, setAyahsTopicId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["admin-topics"], queryFn: api.admin.topics });
  const topics = (data?.topics ?? []) as AdminTopic[];

  const togglePublish = useMutation({
    mutationFn: (t: { id: string; isPublished: boolean; title: string }) =>
      api.admin.updateTopic(t.id, { isPublished: t.isPublished }),
    onSuccess: (_r, t) => {
      queryClient.invalidateQueries({ queryKey: ["admin-topics"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(t.isPublished ? `نُشر الموضوع «${t.title}»` : `أُوقف نشر «${t.title}»`);
    },
    onError: () => toast.error("تعذر تحديث الموضوع"),
  });

  return (
    <div className="space-y-3">
      {/* تنبيه صارم: النص القرآني لا يُعدَّل من هنا */}
      <div
        role="alert"
        className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 rounded-2xl p-4 flex items-start gap-2.5"
      >
        <ShieldAlert size={19} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
          النص القرآني المعتمد لا يُعدَّل من هنا — فهرسة الآيات فقط بالتحقق من المصحف، والاستيراد عبر سكربت التغذية الموثق.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">المواضيع غير المنشورة لا تظهر للقراء</p>
        <Button onClick={() => setCreateOpen(true)} className="h-10 rounded-xl bg-header-gradient hover:opacity-95 font-bold gap-1.5 shrink-0">
          <Plus size={16} />
          موضوع جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="جارٍ تحميل المواضيع">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">لا مواضيع بعد — أنشئ أول موضوع</p>
      ) : (
        <div className="space-y-3">
          {topics.map((t) => (
            <div key={t.id} className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm anim-fade-up">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-[15px] truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {toArabicDigits(t.ayahCount)} آية
                  {!t.isPublished && " · غير منشور"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-9 h-9 rounded-xl text-teal-dark border-teal-soft hover:bg-teal-soft/50"
                  onClick={() => setAyahsTopicId(t.id)}
                  aria-label={`إدارة آيات ${t.title}`}
                >
                  <List size={15} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-9 h-9 rounded-xl text-teal-dark border-teal-soft hover:bg-teal-soft/50"
                  onClick={() => setEditTopic(t)}
                  aria-label={`تعديل وصف ${t.title}`}
                >
                  <Pencil size={15} />
                </Button>
                <Switch
                  checked={t.isPublished}
                  onCheckedChange={(v) => togglePublish.mutate({ id: t.id, isPublished: v, title: t.title })}
                  disabled={togglePublish.isPending}
                  aria-label={`${t.isPublished ? "إيقاف نشر" : "نشر"} موضوع ${t.title}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateTopicDialog open onOpenChange={setCreateOpen} />}
      {editTopic && (
        <EditTopicDescDialog key={editTopic.id} topic={editTopic} onOpenChange={(v) => !v && setEditTopic(null)} />
      )}
      {ayahsTopicId && <TopicAyahsDialog topicId={ayahsTopicId} onOpenChange={(v) => !v && setAyahsTopicId(null)} />}
    </div>
  );
}

/* ============================================================
   تبويب: المقرئون — إضافة وتعديل وافتراضي وإيقاف
   ============================================================ */

function ReciterFormDialog({
  open,
  onOpenChange,
  reciter,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reciter?: AdminReciter;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(reciter);
  const [id, setId] = useState(reciter?.id ?? "");
  const [name, setName] = useState(reciter?.name ?? "");
  const [riwayah, setRiwayah] = useState(reciter?.riwayah ?? "حفص عن عاصم");
  const [style, setStyle] = useState(reciter?.style ?? "مرتل");
  const [bitrate, setBitrate] = useState(reciter?.bitrate ?? "128");
  const [template, setTemplate] = useState(reciter?.audioUrlTemplate ?? "");
  const [source, setSource] = useState(reciter?.source ?? "");
  const [license, setLicense] = useState(reciter?.license ?? "");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        riwayah: riwayah.trim(),
        style: style.trim(),
        bitrate: bitrate.trim(),
        audioUrlTemplate: template.trim(),
        source: source.trim(),
        license: license.trim(),
      };
      return isEdit && reciter ? api.admin.updateReciter(reciter.id, payload) : api.admin.createReciter({ ...payload, id: id.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reciters"] });
      queryClient.invalidateQueries({ queryKey: ["reciters"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(isEdit ? `حُدّث المقرئ «${name.trim()}»` : `أُضيف المقرئ «${name.trim()}»`);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message.includes("409") ? "المعرّف مستخدم بالفعل" : e.message || "تعذر حفظ المقرئ"),
  });

  const submit = () => {
    if (!name.trim() || !template.trim() || (!isEdit && !id.trim())) {
      toast.error("المعرف والاسم ونمط الرابط مطلوبة");
      return;
    }
    if (!/\{\s*(ayah|ayahId)\s*\}/.test(template)) {
      toast.error("نمط الرابط يجب أن يحتوي {ayahId} أو {ayah}");
      return;
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-y-auto nice-scrollbar">
        <DialogHeader className="text-right">
          <DialogTitle>{isEdit ? "تعديل المقرئ" : "إضافة مقرئ"}</DialogTitle>
          <DialogDescription>
            نمط الرابط يُبنى بالعنصر النائب <span dir="ltr" className="font-ui font-bold">{"{ayahId}"}</span> — الرقم العالمي للآية (١–٦٢٣٦).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="rec-id">المعرف (ID) *</Label>
              <Input id="rec-id" value={id} onChange={(e) => setId(e.target.value)} className="h-11" dir="ltr" placeholder="ar.newreciter" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rec-name">الاسم *</Label>
            <Input id="rec-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-riwayah">الرواية</Label>
              <Input id="rec-riwayah" value={riwayah} onChange={(e) => setRiwayah(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-style">النمط</Label>
              <Input id="rec-style" value={style} onChange={(e) => setStyle(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-template">نمط رابط الصوت *</Label>
            <Input
              id="rec-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="h-11"
              dir="ltr"
              placeholder="https://cdn.islamic.network/quran/audio/128/{reciterId}/{ayahId}.mp3"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-bitrate">الجودة (kbps)</Label>
              <Input id="rec-bitrate" value={bitrate} onChange={(e) => setBitrate(e.target.value)} className="h-11" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-source">المصدر</Label>
              <Input id="rec-source" value={source} onChange={(e) => setSource(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-license">الحقوق</Label>
            <Input id="rec-license" value={license} onChange={(e) => setLicense(e.target.value)} className="h-11" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">
            إلغاء
          </Button>
          <Button onClick={submit} disabled={save.isPending} className="h-11 min-w-24 bg-header-gradient hover:opacity-95">
            {save.isPending ? "جارٍ الحفظ…" : isEdit ? "حفظ" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecitersTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editReciter, setEditReciter] = useState<AdminReciter | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-reciters"], queryFn: api.admin.reciters });
  const reciters = data?.reciters ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reciters"] });
    queryClient.invalidateQueries({ queryKey: ["reciters"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const toggleActive = useMutation({
    mutationFn: (r: AdminReciter) => api.admin.updateReciter(r.id, { isActive: !r.isActive }),
    onSuccess: (_r, r) => {
      invalidate();
      toast.success(r.isActive ? `أُوقف المقرئ «${r.name}»` : `فُعّل المقرئ «${r.name}»`);
    },
    onError: () => toast.error("تعذر تحديث المقرئ"),
  });

  const setDefault = useMutation({
    mutationFn: (r: AdminReciter) => api.admin.updateReciter(r.id, { isDefault: true }),
    onSuccess: (_r, r) => {
      invalidate();
      toast.success(`صار «${r.name}» المقرئ الافتراضي`);
    },
    onError: () => toast.error("تعذر تعيين الافتراضي"),
  });

  const remove = useMutation({
    mutationFn: (r: AdminReciter) => api.admin.deleteReciter(r.id),
    onSuccess: (_r, r) => {
      invalidate();
      toast.success(`حُذف المقرئ «${r.name}»`);
    },
    onError: (e: Error) => toast.error(e.message.includes("409") ? "لا يمكن حذف المقرئ الافتراضي" : "تعذر حذف المقرئ"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">النجمة تعيّن الافتراضي — الإيقاف يخفي المقرئ من القائمة دون حذفه</p>
        <Button onClick={() => setFormOpen(true)} className="h-10 rounded-xl bg-header-gradient hover:opacity-95 font-bold gap-1.5 shrink-0">
          <Plus size={16} />
          إضافة مقرئ
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="جارٍ تحميل المقرئين">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {reciters.map((r) => (
            <div key={r.id} className={cn("bg-card rounded-2xl p-4 shadow-sm anim-fade-up", !r.isActive && "opacity-60")}>
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
                  <Mic size={18} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-ink text-[15px] truncate">{r.name}</p>
                    {r.isDefault && <Badge className="bg-teal-soft text-teal-dark shrink-0">افتراضي</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {r.riwayah} · {r.style} · {toArabicDigits(Number(r.bitrate))}kbps
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setDefault.mutate(r)}
                    disabled={r.isDefault || setDefault.isPending}
                    aria-label={r.isDefault ? `${r.name} هو الافتراضي` : `تعيين ${r.name} افتراضيًا`}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      r.isDefault ? "text-amber-500 bg-amber-100 dark:bg-amber-950/50" : "text-muted-foreground/50 hover:text-amber-500"
                    )}
                  >
                    <Star size={15} fill={r.isDefault ? "currentColor" : "none"} />
                  </button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-9 h-9 rounded-xl text-teal-dark border-teal-soft hover:bg-teal-soft/50"
                    onClick={() => setEditReciter(r)}
                    aria-label={`تعديل المقرئ ${r.name}`}
                  >
                    <Pencil size={15} />
                  </Button>
                  {!r.isDefault && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-9 h-9 rounded-xl text-destructive border-destructive/30"
                          aria-label={`حذف المقرئ ${r.name}`}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl" className="max-w-sm">
                        <AlertDialogHeader className="text-right">
                          <AlertDialogTitle>حذف المقرئ «{r.name}»؟</AlertDialogTitle>
                          <AlertDialogDescription>سيُزال من قائمة المقرئين نهائيًا.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
                          <AlertDialogAction className="h-11 bg-destructive hover:bg-destructive/90" onClick={() => remove.mutate(r)}>
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Switch
                    checked={r.isActive}
                    onCheckedChange={() => toggleActive.mutate(r)}
                    disabled={r.isDefault || toggleActive.isPending}
                    aria-label={`${r.isActive ? "إيقاف" : "تفعيل"} المقرئ ${r.name}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <ReciterFormDialog open onOpenChange={setFormOpen} />}
      {editReciter && (
        <ReciterFormDialog key={editReciter.id} open onOpenChange={(v) => !v && setEditReciter(null)} reciter={editReciter} />
      )}
    </div>
  );
}

/* ============================================================
   تبويب: حزم المحتوى — التحديث ورفع الإصدار
   ============================================================ */

const PACKAGE_KIND_META: Record<string, { label: string; icon: LucideIcon }> = {
  text: { label: "نص قرآني", icon: FileText },
  tafsir: { label: "تفسير", icon: BookOpen },
  audio: { label: "صوتيات", icon: Headphones },
  books: { label: "كتب", icon: Book },
};

function PackagesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-packages"], queryFn: api.admin.packages });
  const packages = data?.packages ?? [];

  const refresh = useMutation({
    mutationFn: (p: { key: string; bumpVersion: boolean; name: string; version: number }) =>
      api.admin.refreshPackage(p.key, p.bumpVersion),
    onSuccess: (_r, p) => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(
        p.bumpVersion ? `رُفع إصدار «${p.name}» إلى v${toArabicDigits(p.version + 1)}` : `جُددت حزمة «${p.name}»`
      );
    },
    onError: () => toast.error("تعذر تحديث الحزمة"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="جارٍ تحميل الحزم">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        حزم المحتوى غير المتصل — كل حزمة تُحدَّث مستقلة، ورفع الإصدار يفرض إعادة تنزيل للقراء عند توفر اتصال.
      </p>
      {packages.map((p) => {
        const meta = PACKAGE_KIND_META[p.kind] ?? PACKAGE_KIND_META.books;
        const Icon = meta.icon;
        return (
          <div key={p.id} className="bg-card rounded-2xl p-4 shadow-sm anim-fade-up">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-ink text-[15px] truncate">{p.name}</p>
                  <Badge variant="secondary" className="font-ui shrink-0">
                    v{toArabicDigits(p.version)}
                  </Badge>
                  {p.status === "installed" ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">مثبتة</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">متاحة</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{p.description}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  {meta.label} · {p.sizeLabel}
                  {p.installedAt ? ` · آخر تحديث: ${fmtTime(p.installedAt)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => refresh.mutate({ ...p, bumpVersion: true })}
                disabled={refresh.isPending}
                aria-label={`رفع إصدار حزمة ${p.name}`}
              >
                <ArrowLeftCircle size={14} />
                رفع الإصدار
              </Button>
              <Button
                size="sm"
                onClick={() => refresh.mutate({ ...p, bumpVersion: false })}
                disabled={refresh.isPending}
                className="h-9 rounded-lg bg-header-gradient hover:opacity-95 gap-1.5"
                aria-label={`تحديث حزمة ${p.name}`}
              >
                {refresh.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                تجديد التثبيت
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   تبويب: البيانات — نسخ احتياطي / استعادة / تصدير / صيانة
   ============================================================ */

function DataTab() {
  const queryClient = useQueryClient();
  const [pendingRestore, setPendingRestore] = useState<{ favorites?: unknown[]; bookmarks?: unknown[] } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const { data: overviewData } = useQuery<AdminOverview>({ queryKey: ["admin-overview"], queryFn: api.admin.overview });
  const stats = overviewData?.stats ?? {};

  const backup = useMutation({
    mutationFn: () => api.admin.backup(),
    onSuccess: (res) => {
      downloadJson(res.data, `noor-alhuda-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`);
      toast.success("نُزّلت النسخة الاحتياطية");
    },
    onError: () => toast.error("تعذر إنشاء النسخة الاحتياطية"),
  });

  const exportUser = useMutation({
    mutationFn: () => api.admin.exportUserData(),
    onSuccess: (res) => {
      downloadJson(res.data, `noor-alhuda-user-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`);
      toast.success("نُزّلت بيانات المستخدم");
    },
    onError: () => toast.error("تعذر تصدير البيانات"),
  });

  const restore = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.admin.restore(data),
    onSuccess: () => {
      setPendingRestore(null);
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("استُعيدت النسخة الاحتياطية");
    },
    onError: () => toast.error("تعذر استعادة النسخة"),
  });

  const clearAudit = useMutation({
    mutationFn: () => api.admin.clearAudit(),
    onSuccess: (r) => {
      setClearOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
      toast.success(`فُرّغ السجل (${toArabicDigits(r.deleted)} سجلًا)`);
    },
    onError: () => toast.error("تعذر تفريغ السجل"),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // السماح بإعادة اختيار نفس الملف
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { data?: Record<string, unknown> };
        const d = (parsed.data ?? parsed) as { favorites?: unknown[]; bookmarks?: unknown[] };
        if (!d.favorites && !d.bookmarks) {
          toast.error("الملف لا يحوي بيانات قابلة للاستعادة");
          return;
        }
        setPendingRestore(d);
      } catch {
        toast.error("ملف غير صالح — اختر ملف نسخة احتياطية JSON");
      }
    };
    reader.readAsText(file);
  };

  const CARDS = [
    {
      icon: Download,
      title: "نسخة احتياطية كاملة",
      desc: "المحتوى الإداري + بيانات الاستخدام في ملف JSON واحد.",
      action: () => backup.mutate(),
      actionLabel: backup.isPending ? "جارٍ التجهيز…" : "تنزيل النسخة",
      pending: backup.isPending,
      tone: "teal" as const,
    },
    {
      icon: Upload,
      title: "استعادة نسخة احتياطية",
      desc: "تستبدل المفضلة والعلامات فقط — النص القرآني لا يُستبدل.",
      action: undefined, // تُفتح عبر label مرتبط بحقل الملف أدناه
      actionLabel: "اختيار ملف",
      pending: false,
      tone: "sand" as const,
    },
    {
      icon: FileText,
      title: "تصدير بيانات المستخدم",
      desc: "خصوصية: المفضلة والعلامات والأوراد والإعدادات فقط.",
      action: () => exportUser.mutate(),
      actionLabel: exportUser.isPending ? "جارٍ التصدير…" : "تصدير",
      pending: exportUser.isPending,
      tone: "teal" as const,
    },
  ];

  return (
    <div className="space-y-3">
      {/* حقل الملف المخفي — يُفتح عبر label مرتبط بالمعرّف */}
      <input
        id="restore-file-input"
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
        aria-label="اختر ملف النسخة الاحتياطية"
      />

      {CARDS.map((c) => (
        <div key={c.title} className="bg-card rounded-2xl p-4 shadow-sm anim-fade-up">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                c.tone === "sand" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : "bg-teal-soft text-teal-dark"
              )}
            >
              <c.icon size={18} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-[15px]">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            {c.action ? (
              <Button
                size="sm"
                onClick={c.action}
                disabled={c.pending}
                className="h-9 rounded-lg bg-header-gradient hover:opacity-95 gap-1.5"
              >
                {c.pending && <Loader2 size={14} className="animate-spin" />}
                {c.actionLabel}
              </Button>
            ) : (
              <Button asChild size="sm" className="h-9 rounded-lg bg-header-gradient hover:opacity-95 gap-1.5">
                <label htmlFor="restore-file-input" className="cursor-pointer flex items-center gap-1.5">
                  <Upload size={14} aria-hidden="true" />
                  {c.actionLabel}
                </label>
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* ملخص الحجم */}
      <section aria-label="ملخص البيانات" className="bg-card rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-ink text-sm mb-3">ملخص البيانات</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-secondary/50 rounded-xl py-3">
            <p className="text-lg font-bold text-teal-dark font-ui">{toArabicDigits(stats.booksCount ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">كتب</p>
          </div>
          <div className="bg-secondary/50 rounded-xl py-3">
            <p className="text-lg font-bold text-teal-dark font-ui">{toArabicDigits(stats.chaptersCount ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">فصول</p>
          </div>
          <div className="bg-secondary/50 rounded-xl py-3">
            <p className="text-lg font-bold text-teal-dark font-ui">{toArabicDigits(stats.plansCount ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">أوراد</p>
          </div>
          <div className="bg-secondary/50 rounded-xl py-3">
            <p className="text-lg font-bold text-teal-dark font-ui">{toArabicDigits(stats.favoritesCount ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">مفضلة</p>
          </div>
          <div className="bg-secondary/50 rounded-xl py-3">
            <p className="text-lg font-bold text-teal-dark font-ui">{toArabicDigits(stats.ayahsCount ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">آية معتمدة</p>
          </div>
          <div className="bg-secondary/50 rounded-xl py-3">
            <p className="text-lg font-bold text-teal-dark font-ui">{toArabicDigits(stats.tafsirCount ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">تفسير آية</p>
          </div>
        </div>
      </section>

      {/* منطقة الصيانة */}
      <section aria-label="صيانة" className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-4">
        <h3 className="font-bold text-red-800 dark:text-red-400 text-sm flex items-center gap-1.5">
          <Trash2 size={15} aria-hidden="true" />
          منطقة الصيانة
        </h3>
        <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1 leading-relaxed">
          تفريغ سجل التدقيق لا يمس المحتوى — لا يمكن التراجع بعده.
        </p>
        <div className="flex justify-end mt-3">
          <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 rounded-lg text-destructive border-destructive/40 bg-white/60 dark:bg-transparent">
                تفريغ سجل التدقيق
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="max-w-sm">
              <AlertDialogHeader className="text-right">
                <AlertDialogTitle>تفريغ سجل التدقيق بالكامل؟</AlertDialogTitle>
                <AlertDialogDescription>ستُحذف جميع سجلات العمليات السابقة ولا يمكن التراجع.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
                <AlertDialogAction className="h-11 bg-destructive hover:bg-destructive/90" onClick={() => clearAudit.mutate()}>
                  تفريغ نهائي
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      {/* تأكيد الاستعادة */}
      <AlertDialog
        open={Boolean(pendingRestore)}
        onOpenChange={(v) => {
          if (!v) setPendingRestore(null);
        }}
      >
        <AlertDialogContent dir="rtl" className="max-w-sm">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>استعادة النسخة الاحتياطية؟</AlertDialogTitle>
            <AlertDialogDescription>
              ستستبدل المفضلة ({toArabicDigits(pendingRestore?.favorites?.length ?? 0)}) والعلامات (
              {toArabicDigits(pendingRestore?.bookmarks?.length ?? 0)}) الحالية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-header-gradient hover:opacity-95"
              onClick={() => pendingRestore && restore.mutate(pendingRestore as Record<string, unknown>)}
            >
              استعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   تبويب: السجل — فلاتر وبحث وتفريغ
   ============================================================ */

function AuditTab() {
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", action, entity, search],
    queryFn: () => api.admin.audit({ action, entity, q: search || undefined }),
  });
  const logs = data?.logs ?? [];

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q.trim());
  };

  return (
    <div className="space-y-3">
      {/* الفلاتر */}
      <div className="flex gap-2">
        <Select value={action} onValueChange={setAction} dir="rtl">
          <SelectTrigger className="h-10 flex-1 min-w-0" aria-label="فلترة حسب الإجراء">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الإجراءات</SelectItem>
            {(data?.facets.actions ?? []).map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {ACTION_META[a.value]?.label ?? a.value} ({toArabicDigits(a.count)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity} dir="rtl">
          <SelectTrigger className="h-10 flex-1 min-w-0" aria-label="فلترة حسب الكيان">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الكيانات</SelectItem>
            {(data?.facets.entities ?? []).map((en) => (
              <SelectItem key={en.value} value={en.value}>
                {en.value} ({toArabicDigits(en.count)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث في السجل…"
            className="h-10 pr-9"
            aria-label="بحث في السجل"
          />
        </div>
        <Button type="submit" variant="secondary" className="h-10 rounded-lg font-bold shrink-0">
          بحث
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2" aria-label="جارٍ تحميل السجل">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">لا سجلات مطابقة</p>
      ) : (
        <div className="space-y-2">
          {logs.map((a) => (
            <AuditRow key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   الشاشة الرئيسية — بوابة الجلسة + 8 تبويبات
   ============================================================ */

const TABS = [
  { value: "overview", label: "نظرة عامة" },
  { value: "books", label: "الكتب" },
  { value: "sections", label: "الأقسام" },
  { value: "topics", label: "المواضيع" },
  { value: "reciters", label: "المقرئون" },
  { value: "packages", label: "الحزم" },
  { value: "data", label: "البيانات" },
  { value: "audit", label: "السجل" },
] as const;

export function AdminPanelScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<string>("overview");
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["admin-session"],
    queryFn: api.admin.session,
  });
  const authed = Boolean(session?.authenticated);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="لوحة الإدارة" onClose={onClose} user={session?.user ?? null} />

      {sessionLoading ? (
        <main className="max-w-lg mx-auto px-4 py-6 space-y-3" aria-label="جارٍ التحقق من الجلسة">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      ) : !authed ? (
        <AdminLoginScreen onSuccess={() => setTab("overview")} />
      ) : (
        <main className="max-w-lg mx-auto px-4 py-4 pb-28">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-4 h-auto rounded-2xl p-1 bg-secondary gap-0.5">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-xl text-[11px] font-bold min-h-9 py-1.5 px-1 data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-4 outline-none">
              <OverviewTab onJump={setTab} />
            </TabsContent>
            <TabsContent value="books" className="mt-4 outline-none">
              <BooksTab />
            </TabsContent>
            <TabsContent value="sections" className="mt-4 outline-none">
              <SectionsTab />
            </TabsContent>
            <TabsContent value="topics" className="mt-4 outline-none">
              <TopicsTab />
            </TabsContent>
            <TabsContent value="reciters" className="mt-4 outline-none">
              <RecitersTab />
            </TabsContent>
            <TabsContent value="packages" className="mt-4 outline-none">
              <PackagesTab />
            </TabsContent>
            <TabsContent value="data" className="mt-4 outline-none">
              <DataTab />
            </TabsContent>
            <TabsContent value="audit" className="mt-4 outline-none">
              <AuditTab />
            </TabsContent>
          </Tabs>
        </main>
      )}
    </div>
  );
}
