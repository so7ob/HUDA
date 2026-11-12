"use client";

/**
 * overlay «المقرئون» — قائمة المقرئين مع تعيين الافتراضي
 * وربط سريع لشاشة إدارة التنزيلات.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Download, Mic, BadgeCheck } from "lucide-react";
import { HudaImg, HUDA_ASSETS } from "@/components/shared/huda-assets";

import { useAppStore } from "@/lib/store";
import { api, type ReciterItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

function ReciterRow({
  reciter,
  pending,
  onSetDefault,
}: {
  reciter: ReciterItem;
  pending: boolean;
  onSetDefault: (r: ReciterItem) => void;
}) {
  const isDefault = reciter.isDefault;
  return (
    <button
      onClick={() => !isDefault && onSetDefault(reciter)}
      disabled={pending && !isDefault}
      role="radio"
      aria-checked={isDefault}
      aria-label={`${reciter.name} — ${isDefault ? "المقرئ الافتراضي" : "تعيين كافتراضي"}`}
      className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 text-right shadow-sm hover:bg-accent/50 active:scale-[0.99] transition-all anim-fade-up"
    >
      {/* دائرة الراديو / نجمة الافتراضي */}
      <span
        className={
          isDefault
            ? "w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow"
            : "w-7 h-7 rounded-full border-2 border-muted-foreground/35 shrink-0 bg-background"
        }
        aria-hidden="true"
      >
        {isDefault && <HudaImg src={HUDA_ASSETS.shapes.checkSmall} size={15} className="drop-shadow" />}
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-bold text-ink text-[15px] truncate">{reciter.name}</span>
          {isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft text-teal-dark px-2 py-0.5 text-[10px] font-bold shrink-0">
              <BadgeCheck size={11} />
              افتراضي
            </span>
          )}
        </span>
        <span className="block text-xs text-muted-foreground mt-1">
          {reciter.riwayah} · {reciter.style} · {reciter.bitrate} كبت/ث
        </span>
        <span className="block text-[11px] text-muted-foreground/80 mt-0.5 truncate" dir="ltr">
          {reciter.source}
        </span>
      </span>
    </button>
  );
}

export function RecitersScreen({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const openOverlay = useAppStore((s) => s.openOverlay);

  const { data, isLoading } = useQuery({ queryKey: ["reciters"], queryFn: api.reciters });
  const reciters = data?.reciters ?? [];

  const setDefault = useMutation({
    mutationFn: (r: ReciterItem) => api.setDefaultReciter(r.id),
    onSuccess: (_res, r) => {
      queryClient.invalidateQueries({ queryKey: ["reciters"] });
      toast.success(`تم تعيين الشيخ ${r.name} مقرئًا افتراضيًا`);
    },
    onError: () => toast.error("تعذر تعيين المقرئ — حاول مجددًا"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="المقرئون" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          اختر المقرئ الافتراضي لتلاوات الآيات — يمكنك تنزيل السور الكاملة للاستماع دون إنترنت.
        </p>

        {isLoading ? (
          <div className="space-y-3" aria-label="جارٍ تحميل المقرئين">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : reciters.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Mic size={40} className="mx-auto text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">لا يوجد مقرئون متاحون حاليًا</p>
          </div>
        ) : (
          <div className="space-y-3" role="radiogroup" aria-label="اختيار المقرئ الافتراضي">
            {reciters.map((r) => (
              <ReciterRow
                key={r.id}
                reciter={r}
                pending={setDefault.isPending}
                onSetDefault={(x) => setDefault.mutate(x)}
              />
            ))}
          </div>
        )}

        <Button
          onClick={() => openOverlay({ kind: "downloads" })}
          className="w-full h-12 rounded-2xl bg-header-gradient hover:opacity-95 text-white font-bold gap-2"
        >
          <Download size={18} />
          إدارة التنزيلات
        </Button>
      </main>
    </div>
  );
}
