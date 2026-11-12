"use client";

/**
 * overlay «مركز الإشعارات» — آخر التنبيهات والتذكيرات
 * قراءة عند النقر + مسح الكل مع تأكيد.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import { toast } from "sonner";
import { ChevronRight, Bell, BellOff, Award, Info, Clock, type LucideIcon } from "lucide-react";

import { api, type NotificationItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

function OverlayHeader({ title, onClose }: { title: string; onClose: () => void }) {
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
        <span className="w-11 shrink-0" aria-hidden="true" />
      </div>
    </header>
  );
}

const KIND_META: Record<string, { icon: LucideIcon; classes: string }> = {
  reminder: { icon: Bell, classes: "bg-teal-soft text-teal-dark" },
  achievement: { icon: Award, classes: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
  system: { icon: Info, classes: "bg-muted text-muted-foreground" },
};

/** التاريخ النسبي بالعربية */
function relativeDate(iso?: string): string {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: arSA });
  } catch {
    return "";
  }
}

function NotificationCard({ n, onRead }: { n: NotificationItem; onRead: (id: string) => void }) {
  const meta = KIND_META[n.kind] ?? KIND_META.system;
  const Icon = meta.icon;
  return (
    <button
      onClick={() => onRead(n.id)}
      aria-label={`${n.title}${n.isRead ? "" : " — غير مقروء"}`}
      className={cn(
        "w-full bg-card rounded-2xl p-4 flex items-start gap-3 text-right shadow-sm hover:bg-accent/50 active:scale-[0.99] transition-all anim-fade-up",
        n.isRead && "opacity-70"
      )}
    >
      <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", meta.classes)}>
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-bold text-ink text-[15px] flex-1 min-w-0">{n.title}</span>
          {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" aria-label="غير مقروء" />}
        </span>
        <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</span>
        <span className="block text-[11px] text-muted-foreground/80 mt-1.5 flex items-center gap-1">
          <Clock size={11} aria-hidden="true" />
          {relativeDate(n.fireAt ?? n.scheduledAt)}
        </span>
      </span>
    </button>
  );
}

export function NotificationsCenterScreen({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("تعذر تحديث الإشعار"),
  });

  const clearAll = useMutation({
    mutationFn: api.clearNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("تم مسح جميع الإشعارات");
    },
    onError: () => toast.error("تعذر مسح الإشعارات — حاول مجددًا"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="مركز الإشعارات" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        {/* ✦ شريط الحالة + المسح ✦ */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {notifications.length === 0
              ? "لا توجد إشعارات"
              : `${unreadCount === 0 ? "كل الإشعارات مقروءة" : `لديك ${unreadCount} إشعارًا غير مقروء`}`}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-destructive hover:bg-destructive/10 font-bold"
                disabled={notifications.length === 0 || clearAll.isPending}
              >
                مسح الكل
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="max-w-sm">
              <AlertDialogHeader className="text-right">
                <AlertDialogTitle>مسح جميع الإشعارات؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيُحذف سجل التنبيهات والتذكيرات كاملًا ولا يمكن التراجع.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  className="h-11 bg-destructive hover:bg-destructive/90"
                  onClick={() => clearAll.mutate()}
                >
                  مسح الكل
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* ✦ القائمة ✦ */}
        {isLoading ? (
          <div className="space-y-3" aria-label="جارٍ تحميل الإشعارات">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <BellOff size={40} className="mx-auto text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              لا إشعارات بعد
              <br />
              ستظهر تذكيرات الأوراد والتنبيهات هنا
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationCard key={n.id} n={n} onRead={(id) => markRead.mutate(id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
