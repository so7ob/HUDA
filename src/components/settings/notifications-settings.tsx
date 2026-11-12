"use client";

/**
 * overlay «الإعدادات ← الإشعارات»
 * مفاتيح محفوظة عبر api.settings: notificationsEnabled / notificationSound / notificationVibrate
 * + إذن إشعارات النظام + إشعار تجريبي فوري.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  Bell,
  BellRing,
  Vibrate,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";

import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

/** صف مفتاح إعداد مع وصف */
function SettingRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm anim-fade-up">
      <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ink text-[15px]">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export function NotificationsSettingsScreen({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });
  const settings = data?.settings ?? {};
  const boolVal = (key: string, fallback: boolean) =>
    settings[key] === undefined ? fallback : Boolean(settings[key]);

  const enabled = boolVal("notificationsEnabled", true);
  const sound = boolVal("notificationSound", true);
  const vibrate = boolVal("notificationVibrate", false);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.saveSettings(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
    onError: () => {
      toast.error("تعذر حفظ الإعداد — حاول مجددًا");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  /** تحديث فوري (optimistic) ثم مزامنة مع الخادم */
  const toggle = (key: string, value: boolean) => {
    queryClient.setQueryData<{ settings: Record<string, unknown> }>(["settings"], (old) => ({
      settings: { ...(old?.settings ?? {}), [key]: value },
    }));
    save.mutate({ [key]: value });
  };

  const testNotification = useMutation({
    mutationFn: () =>
      api.createNotification({
        title: "تجربة تذكير",
        body: "هذا إشعار تجريبي من نور الهدى",
        fireAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("أُنشئ الإشعار التجريبي — ستجده في مركز الإشعارات");
    },
    onError: () => toast.error("تعذر إنشاء الإشعار التجريبي"),
  });

  const requestPermission = async () => {
    if (typeof Notification === "undefined") {
      toast.error("متصفحك لا يدعم إشعارات النظام");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        toast.success("تم منح إذن الإشعارات — ستصلك التنبيهات على مستوى النظام");
      } else if (result === "denied") {
        toast.error("رُفض الإذن — يمكنك تفعيله لاحقًا من إعدادات المتصفح");
      } else {
        toast.info("لم يُحسم الإذن بعد — حاول مرة أخرى");
      }
    } catch {
      toast.error("تعذر طلب إذن الإشعارات");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="الإشعارات" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        {isLoading ? (
          <div className="space-y-3" aria-label="جارٍ تحميل الإعدادات">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <SettingRow
              icon={Bell}
              label="تفعيل الإشعارات"
              description="مفتاح التذكيرات والتنبيهات داخل التطبيق"
              checked={enabled}
              onCheckedChange={(v) => toggle("notificationsEnabled", v)}
            />
            <SettingRow
              icon={BellRing}
              label="نغمة التنبيه"
              description="تشغيل صوت عند وصول تذكير"
              checked={sound}
              onCheckedChange={(v) => toggle("notificationSound", v)}
            />
            <SettingRow
              icon={Vibrate}
              label="الاهتزاز"
              description="اهتزاز الجهاز عند وصول تذكير (إن دُعم)"
              checked={vibrate}
              onCheckedChange={(v) => toggle("notificationVibrate", v)}
            />
          </>
        )}

        {/* ✦ إذن النظام ✦ */}
        <section
          aria-label="إذن إشعارات النظام"
          className="bg-card rounded-2xl p-4 space-y-3 shadow-sm anim-fade-up"
        >
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
              <ShieldCheck size={19} strokeWidth={1.9} />
            </span>
            <div className="flex-1">
              <p className="font-bold text-ink text-[15px]">إشعارات النظام</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                امنح الإذن لتظهر التذكيرات حتى عند تصغير التطبيق (حسب دعم جهازك).
              </p>
            </div>
          </div>
          <Button
            onClick={requestPermission}
            variant="outline"
            className="w-full h-11 rounded-xl border-teal-soft text-teal-dark hover:bg-teal-soft/50 font-bold"
          >
            منح إذن إشعارات النظام
          </Button>
        </section>

        {/* ✦ إشعار تجريبي ✦ */}
        <section aria-label="إشعار تجريبي" className="bg-card rounded-2xl p-4 space-y-3 shadow-sm anim-fade-up">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={19} strokeWidth={1.9} />
            </span>
            <div className="flex-1">
              <p className="font-bold text-ink text-[15px]">تجربة الإعدادات</p>
              <p className="text-xs text-muted-foreground mt-0.5">أنشئ إشعارًا فوريًا للتأكد من عمل التذكيرات.</p>
            </div>
          </div>
          <Button
            onClick={() => testNotification.mutate()}
            disabled={testNotification.isPending}
            className="w-full h-11 rounded-xl bg-header-gradient hover:opacity-95 text-white font-bold"
          >
            {testNotification.isPending ? "جارٍ الإنشاء…" : "تجربة إشعار"}
          </Button>
        </section>

        {/* ✦ ملاحظة توضيحية ✦ */}
        <div className="bg-cream rounded-2xl p-4 flex items-start gap-2.5">
          <Info size={17} className="text-gold-deep shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-ink/75 leading-relaxed">
            تعمل التذكيرات أثناء فتح التطبيق دون إنترنت؛ في نسخة الجوال تعمل بالخلفية عبر نظام الإشعارات المحلية.
          </p>
        </div>
      </main>
    </div>
  );
}
