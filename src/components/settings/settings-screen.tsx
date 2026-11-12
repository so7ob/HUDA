"use client";

/**
 * شاشة تبويب «الإعدادات» — نمط بطاقات الصفوف البيضاء:
 * أيقونة فيروزية + عنوان bold + سطر وصف رمادي + سهم انتقال (ChevronLeft).
 * تدير: تعريف المستخدم، العرض والنصوص (DisplaySheet)، والشاشات المنبثقة التسع.
 */
import { useState, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Monitor,
  Type,
  Mic,
  Bell,
  Inbox,
  Download,
  Package,
  DatabaseBackup,
  Info,
  ShieldCheck,
  ChevronLeft,
  Pencil,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DisplaySheet } from "@/components/quran/display-sheet";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RowKind =
  | "reciters"
  | "notificationsSettings"
  | "notificationsCenter"
  | "downloads"
  | "packages"
  | "backup"
  | "about"
  | "admin";

/** بطاقة صف واحدة */
function RowCard({
  icon: Icon,
  title,
  description,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm anim-fade-up">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-3 text-right touch-target"
        aria-label={`${title} — ${description}`}
      >
        <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-ink text-[15px]">{title}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>
        </span>
        <ChevronLeft size={18} className="text-muted-foreground/70 shrink-0" aria-hidden="true" />
      </button>
      {trailing}
    </div>
  );
}

export function SettingsScreen() {
  const { userName, setUserName, setTab, openOverlay } = useAppStore();
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [displayOpen, setDisplayOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const mounted = useMounted();
  const isDark = Boolean(mounted && resolvedTheme === "dark");

  const saveName = useMutation({
    mutationFn: (name: string) => api.saveSettings({ userName: name }),
    onSuccess: (_res, name) => {
      setUserName(name);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("تم تحديث الاسم بنجاح");
      setNameDialogOpen(false);
    },
    onError: () => toast.error("تعذر حفظ الاسم — حاول مجددًا"),
  });

  const rows: { icon: LucideIcon; title: string; description: string; kind: RowKind }[] = [
    { icon: Mic, title: "المقرئون", description: "إدارة المقرئين وقراءاتهم", kind: "reciters" },
    { icon: Bell, title: "الإشعارات", description: "خيارات التذكيرات والتنبيهات", kind: "notificationsSettings" },
    { icon: Inbox, title: "مركز الإشعارات", description: "آخر التنبيهات والتذكيرات", kind: "notificationsCenter" },
    { icon: Download, title: "التنزيلات", description: "إدارة التلاوات المحملة", kind: "downloads" },
    { icon: Package, title: "حزم المحتوى", description: "حزم العمل دون إنترنت", kind: "packages" },
    { icon: DatabaseBackup, title: "النسخ الاحتياطي", description: "تصدير واستيراد بياناتك", kind: "backup" },
    { icon: Info, title: "حول التطبيق", description: "النسخة والمصادر والخصوصية", kind: "about" },
    { icon: ShieldCheck, title: "لوحة الإدارة", description: "إدارة المحتوى والنشر", kind: "admin" },
  ];

  const openNameDialog = () => {
    setNameDraft(userName);
    setNameDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ✦ الترويسة الفيروزية ✦ */}
      <header className="bg-header-gradient header-pattern overflow-hidden text-white rounded-b-[28px] pb-10 shadow-md">
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setTab("quran")}
              aria-label="رجوع إلى القرآن"
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={24} strokeWidth={1.8} />
            </button>
            <h1 className="font-ui font-bold text-xl tracking-tight">الإعدادات</h1>
            <span className="w-11 shrink-0" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm text-white/85 text-center">خصّص تطبيقك: العرض، المقرئون، الإشعارات، والبيانات</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-7 relative z-10 space-y-3">
        {/* ✦ بطاقة تعريف المستخدم ✦ */}
        <section
          aria-label="بطاقة المستخدم"
          className="bg-card rounded-3xl p-4 flex items-center gap-3.5 shadow-[0_6px_24px_rgba(23,90,94,0.12)] anim-fade-up"
        >
          <span
            className="w-14 h-14 rounded-full bg-header-gradient text-white flex items-center justify-center text-2xl font-bold shadow-inner shrink-0"
            aria-hidden="true"
          >
            {userName.trim().charAt(0) || "ن"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ink text-lg truncate">{userName || "قارئ نور الهدى"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">مستخدم نور الهدى — تُحفظ بياناتك على جهازك</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-11 h-11 text-teal-dark border-teal-soft hover:bg-teal-soft/60"
            onClick={openNameDialog}
            aria-label="تعديل الاسم"
          >
            <Pencil size={17} />
          </Button>
        </section>

        {/* ✦ بطاقات الإعدادات ✦ */}
        <RowCard
          icon={Monitor}
          title="العرض"
          description="مظهر التطبيق وطرق العرض"
          onClick={() => setDisplayOpen(true)}
          trailing={
            <span className="flex flex-col items-center gap-1 shrink-0 pl-1">
              <Switch
                checked={isDark}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label="الوضع الليلي"
              />
              <span className="text-[10px] text-muted-foreground font-medium">ليلي</span>
            </span>
          }
        />
        <RowCard
          icon={Type}
          title="النصوص"
          description="تفضيلات الخط وقراءة الكتب"
          onClick={() => setDisplayOpen(true)}
        />
        {rows.map((r) => (
          <RowCard
            key={r.kind}
            icon={r.icon}
            title={r.title}
            description={r.description}
            onClick={() => openOverlay({ kind: r.kind })}
          />
        ))}

        <p className={cn("text-center text-[11px] text-muted-foreground pt-1 leading-relaxed")}>
          نور الهدى — الإصدار ١٫٠٫٠ · بياناتك محلية ودون تتبع
        </p>
      </main>

      {/* ✦ ورقة كيفية العرض (مشتركة مع القارئ) ✦ */}
      <DisplaySheet open={displayOpen} onOpenChange={setDisplayOpen} />

      {/* ✦ حوار تعديل الاسم ✦ */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل الاسم</DialogTitle>
            <DialogDescription className="text-right">
              يظهر اسمك في الترحيب وفي بطاقة الإعدادات.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="اكتب اسمك"
            maxLength={40}
            aria-label="الاسم"
            className="h-11"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setNameDialogOpen(false)} className="h-11">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                const name = nameDraft.trim();
                if (!name) {
                  toast.error("الاسم لا يمكن أن يكون فارغًا");
                  return;
                }
                saveName.mutate(name);
              }}
              disabled={saveName.isPending}
              className="h-11 min-w-24"
            >
              {saveName.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const subscribeNoop = () => () => {};

/** حماية من اختلاف الترطيب عند قراءة سمة الثيم من next-themes */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}
