"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Flag,
  Loader2,
  MoonStar,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { HudaImg, HUDA_ASSETS } from "@/components/shared/huda-assets";
import { useAppStore } from "@/lib/store";
import { api, type PlanItem } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ============================================================
   شاشة «البرنامج اليومي» — الأوراد والبرامج
   تبويب رئيسي (بلا onClose): ترويسة فيروزية + لوحة بيضاء
   ============================================================ */

type StatusTab = "active" | "paused" | "finished";
type KindTab = "wird" | "program";

const todayISO = () => new Date().toISOString().slice(0, 10);

/** حساب التقدم: صفحات للقرآن، أيام لغيره */
function planProgress(p: PlanItem): { pct: number; caption: string } {
  if (p.targetType === "quran_pages" && typeof p.pagesRead === "number" && p.totalPages > 0) {
    const pct = Math.min(100, Math.round((p.pagesRead / p.totalPages) * 100));
    return { pct, caption: `${toArabicDigits(p.pagesRead)} / ${toArabicDigits(p.totalPages)} صفحة` };
  }
  const done = p.doneDays ?? 0;
  const total = p.totalDays ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { pct, caption: `${toArabicDigits(done)} / ${toArabicDigits(total)} يوم` };
}

/** صفحات اليوم المقترحة للورود القرآنية الموزعة على مدة */
function pagesForToday(p: PlanItem): number {
  if (p.targetType !== "quran_pages" || !p.totalPages) return 0;
  let days: number | null = null;
  if (p.endDate) {
    const diff = Math.ceil((new Date(`${p.endDate}T23:59:59`).getTime() - Date.now()) / 86_400_000);
    days = diff > 0 ? diff : null;
  }
  if (!days) days = p.totalDays && p.totalDays > 0 ? p.totalDays : null;
  if (!days) return 0;
  return Math.max(1, Math.ceil(p.totalPages / days));
}

const repeatLabel = (r: string) => (r === "weekly" ? "أسبوعي" : "يومي");

export function PlansScreen() {
  const { openOverlay, setTab } = useAppStore();
  const queryClient = useQueryClient();

  const [kindTab, setKindTab] = useState<KindTab>("wird");
  const [statusTab, setStatusTab] = useState<StatusTab>("active");
  const [confirm, setConfirm] = useState<{ plan: PlanItem; action: "finish" | "delete" } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["plans", statusTab],
    queryFn: () => api.plans(statusTab),
  });

  const plans = useMemo(() => {
    const list = data?.plans ?? [];
    return list.filter((p) => (kindTab === "wird" ? p.kind === "wird" : p.kind === "daily" || p.kind === "ramadan"));
  }, [data, kindTab]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plans"] });

  /* إنجاز / تراجع */
  const logMutation = useMutation({
    mutationFn: (vars: { id: string; done: boolean; pages?: number }) =>
      api.logPlan(vars.id, todayISO(), vars.done, vars.pages),
    onSuccess: (_res, vars) => {
      invalidate();
      if (vars.done) toast.success("تقبّل الله وردك — أُنجز اليوم");
      else toast("تم التراجع عن إنجاز اليوم");
    },
    onError: () => toast.error("تعذر تسجيل الإنجاز، حاول مجددًا"),
  });

  /* إيقاف / استئناف / إنهاء */
  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: string }) => api.updatePlan(vars.id, { status: vars.status }),
    onSuccess: (_res, vars) => {
      invalidate();
      if (vars.status === "paused") toast.success("تم إيقاف الورد مؤقتًا");
      else if (vars.status === "active") toast.success("تم استئناف الورد — نوّر طريقك");
      else toast.success("تم إنهاء البرنامج — أحسنتَ");
    },
    onError: () => toast.error("تعذر تحديث الحالة، حاول مجددًا"),
  });

  /* حذف */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlan(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الورد");
    },
    onError: () => toast.error("تعذر الحذف، حاول مجددًا"),
  });

  const busy = logMutation.isPending || statusMutation.isPending || deleteMutation.isPending;

  return (
    <div className="pb-28 min-h-screen bg-background">
      {/* ✦ الترويسة الفيروزية ✦ */}
      <header className="bg-header-gradient header-pattern overflow-hidden text-white rounded-b-[28px] pb-8 shadow-md">
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => openOverlay({ kind: "notificationsCenter" })}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="مركز الإشعارات"
            >
              <Bell size={24} strokeWidth={1.8} />
            </button>
            <h1 className="font-ui font-bold text-xl tracking-tight">البرنامج اليومي</h1>
            <button
              onClick={() => setTab("settings")}
              className="touch-target flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="الإعدادات"
            >
              <Settings size={24} strokeWidth={1.8} />
            </button>
          </div>
          <p className="mt-3 text-sm text-white/85 leading-relaxed text-right">
            أورادك وبرامجك في مكان واحد — دوّن تقدمك كل يوم
          </p>
        </div>
      </header>

      {/* ✦ اللوحة البيضاء ✦ */}
      <main className="max-w-lg mx-auto px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-t-[28px] pt-4 shadow-[0_-6px_24px_rgba(23,90,94,0.08)]">
          {/* تبويبا النوع */}
          <div className="bg-secondary rounded-full p-1 flex mx-2">
            {(
              [
                ["wird", "الورد اليومي"],
                ["program", "البرنامج اليومي"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setKindTab(id)}
                className={cn(
                  "flex-1 rounded-full py-2.5 text-sm font-bold transition-all",
                  kindTab === id ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-primary"
                )}
                aria-pressed={kindTab === id}
              >
                {label}
              </button>
            ))}
          </div>

          {/* التبويبات الفرعية بخط سفلي */}
          <div className="flex mt-4 px-2 border-b border-border/70">
            {(
              [
                ["active", "مستمر"],
                ["paused", "متوقف"],
                ["finished", "منتهي"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setStatusTab(id)}
                className={cn(
                  "flex-1 pb-2.5 text-sm font-medium relative transition-colors",
                  statusTab === id ? "text-primary" : "text-muted-foreground"
                )}
                aria-pressed={statusTab === id}
              >
                {label}
                {statusTab === id && <span className="absolute bottom-0 inset-x-4 h-[3px] rounded-full bg-primary" />}
              </button>
            ))}
          </div>

          <div className="px-2 pt-3 pb-4 space-y-3" role="list" aria-label="قائمة الأوراد">
            {/* بطاقة ختمة رمضان المميزة */}
            {statusTab === "active" && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() =>
                  openOverlay({
                    kind: "planEditor",
                    prefill: {
                      name: "ختمة رمضان",
                      targetType: "quran_pages",
                      targetRef: JSON.stringify({ pages: 604 }),
                      totalPages: 604,
                      kind: "ramadan",
                    },
                  })
                }
                className="w-full text-right rounded-3xl overflow-hidden relative shadow-lg active:scale-[0.99] transition-transform"
                aria-label="إنشاء ختمة رمضان"
              >
                <div className="absolute inset-0 bg-cover-gradient night" aria-hidden="true">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.22) 0, transparent 40%), radial-gradient(circle at 82% 70%, rgba(185,153,95,0.4) 0, transparent 45%)",
                    }}
                  />
                </div>
                <div className="relative p-4 flex items-center gap-3 text-white">
                  <MoonStar size={28} strokeWidth={1.6} className="shrink-0 drop-shadow" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg">ختمة رمضان</h3>
                    <p className="text-xs opacity-85 mt-0.5">
                      أكمل المصحف في الشهر — {toArabicDigits(604)} صفحة موزعة على أيامه
                    </p>
                  </div>
                  <Plus size={20} className="opacity-80 shrink-0" />
                </div>
              </motion.button>
            )}

            {/* التحميل */}
            {isLoading && (
              <div className="py-16 flex justify-center text-primary" role="status" aria-label="جارٍ التحميل">
                <Loader2 className="animate-spin" size={28} />
              </div>
            )}

            {/* حالة الفراغ — مع رمز القُطرة من أصول «هدى الله» */}
            {!isLoading && plans.length === 0 && (
              <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="relative" aria-hidden="true">
                  <HudaImg src={HUDA_ASSETS.shapes.dropletTeal} size={52} className="opacity-80" />
                  <CalendarDays size={22} strokeWidth={1.4} className="text-muted-foreground/50 absolute -bottom-1 -left-2 bg-background rounded-full" />
                </div>
                <p className="text-muted-foreground font-ui">لا توجد نتائج</p>
              </div>
            )}

            {/* قائمة الأوراد */}
            {!isLoading &&
              plans.map((p) => {
                const prog = planProgress(p);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="listitem"
                    className="rounded-2xl border border-border/60 bg-card-bg/70 card-soft p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* قطرة «الورد» من أصول «هدى الله» */}
                          <HudaImg src={HUDA_ASSETS.shapes.dropletTeal} size={15} className="shrink-0 self-center" />
                          <h3 className="font-bold text-ink truncate">{p.name}</h3>
                          {p.todayDone && (
                            <Badge className="bg-green-600/15 text-green-800 border-transparent hover:bg-green-600/15">
                              أُنجز اليوم
                            </Badge>
                          )}
                        </div>
                        {p.targetLabel && <p className="text-sm text-muted-foreground mt-0.5">{p.targetLabel}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="touch-target flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-ink transition-colors"
                            aria-label={`خيارات ${p.name}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {p.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => statusMutation.mutate({ id: p.id, status: "paused" })}
                              disabled={busy}
                            >
                              <Pause size={14} /> إيقاف مؤقت
                            </DropdownMenuItem>
                          )}
                          {p.status === "paused" && (
                            <DropdownMenuItem
                              onClick={() => statusMutation.mutate({ id: p.id, status: "active" })}
                              disabled={busy}
                            >
                              <Play size={14} /> استئناف
                            </DropdownMenuItem>
                          )}
                          {p.status !== "finished" && (
                            <DropdownMenuItem onClick={() => setConfirm({ plan: p, action: "finish" })} disabled={busy}>
                              <Flag size={14} /> إنهاء
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setConfirm({ plan: p, action: "delete" })}
                            disabled={busy}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 size={14} /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* الشارات */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {p.reminderTime && (
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <Bell size={11} /> {toArabicDigits(p.reminderTime)}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="gap-1 font-normal">
                        <CalendarDays size={11} /> {repeatLabel(p.repeatKind)}
                      </Badge>
                    </div>

                    {/* شريط التقدم */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{prog.caption}</span>
                        <span className="font-bold text-primary">{toArabicDigits(prog.pct)}٪</span>
                      </div>
                      <Progress value={prog.pct} aria-label={`تقدم ${p.name}: ${prog.pct}٪`} />
                    </div>

                    {/* إنجاز اليوم — للأوراد المستمرة فقط */}
                    {p.status === "active" && (
                      <Button
                        onClick={() =>
                          p.todayDone
                            ? logMutation.mutate({ id: p.id, done: false })
                            : logMutation.mutate({ id: p.id, done: true, pages: pagesForToday(p) })
                        }
                        disabled={logMutation.isPending}
                        className={cn(
                          "mt-3 w-full h-11 rounded-xl font-bold gap-2 text-white",
                          p.todayDone ? "bg-green-600 hover:bg-green-600/90" : "bg-primary hover:bg-primary/90"
                        )}
                        aria-label={p.todayDone ? `التراجع عن إنجاز ${p.name} اليوم` : `إنجاز ${p.name} اليوم`}
                      >
                        {logMutation.isPending && logMutation.variables?.id === p.id ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        {p.todayDone ? "أُنجز اليوم — اضغط للتراجع" : "إنجاز اليوم"}
                      </Button>
                    )}
                    {p.status === "paused" && (
                      <p className="mt-3 text-xs text-muted-foreground text-center">
                        متوقف مؤقتًا — استأنفه من قائمة الخيارات
                      </p>
                    )}
                    {p.status === "finished" && (
                      <p className="mt-3 text-xs text-green-700 text-center font-medium">اكتمل البرنامج — أحسنتَ</p>
                    )}
                  </motion.div>
                );
              })}
          </div>
        </div>
      </main>

      {/* ✦ الزر العائم ✦ */}
      <div className="fixed inset-x-0 bottom-[150px] z-30 pointer-events-none" aria-hidden="false">
        <div className="max-w-lg mx-auto px-4 flex justify-start">
          <button
            onClick={() => openOverlay({ kind: "planEditor" })}
            className="pointer-events-auto touch-target w-14 h-14 rounded-full bg-header-gradient text-white shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="ورد أو برنامج جديد"
          >
            <Plus size={26} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* حوار التأكيد: إنهاء / حذف */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-ui text-right">
              {confirm ? (confirm.action === "delete" ? `حذف «${confirm.plan?.name ?? ""}»؟` : `إنهاء «${confirm.plan?.name ?? ""}»؟`) : ""}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {confirm?.action === "delete"
                ? "سيُحذف الورد مع كل سجل الإنجاز، ولا يمكن التراجع بعد الحذف."
                : "سيُنقل البرنامج إلى قائمة «منتهي» مع الاحتفاظ بسجل إنجازه."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm.action === "delete") deleteMutation.mutate(confirm.plan.id);
                else statusMutation.mutate({ id: confirm.plan.id, status: "finished" });
                setConfirm(null);
              }}
              className={confirm?.action === "delete" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            >
              {confirm?.action === "delete" ? "حذف" : "إنهاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
