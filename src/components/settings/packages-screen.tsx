"use client";

/**
 * overlay «حزم المحتوى» — حزم العمل دون إنترنت
 * حالة كل حزمة + زر تحقق/تحديث.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  Package,
  WifiOff,
  Loader2,
  RefreshCw,
  CheckCircle2,
  CloudDownload,
} from "lucide-react";

import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PackageRow = {
  id: string;
  key: string;
  name: string;
  kind: string;
  description: string;
  version: number;
  status: string;
  sizeLabel: string;
  installedAt?: string;
};

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

/** شارة حالة الحزمة */
function StatusBadge({ status }: { status: string }) {
  if (status === "installed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold">
        <CheckCircle2 size={12} />
        مثبتة
      </span>
    );
  }
  if (status === "updating") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-bold">
        <Loader2 size={12} className="animate-spin" />
        جارٍ التحديث
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-bold">
      <CloudDownload size={12} />
      متاحة
    </span>
  );
}

function PackageCard({ p, onRefresh, refreshing }: { p: PackageRow; onRefresh: (p: PackageRow) => void; refreshing: boolean }) {
  const installed = p.status === "installed";
  const updating = p.status === "updating" || refreshing;
  return (
    <div className="bg-card rounded-2xl p-4 space-y-2.5 shadow-sm anim-fade-up">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
          <Package size={19} strokeWidth={1.9} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-ink text-[15px] truncate">{p.name}</p>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-muted-foreground">
          {p.sizeLabel} · الإصدار {toArabicDigits(p.version)}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={updating}
          onClick={() => onRefresh(p)}
          className="h-9 rounded-lg border-teal-soft text-teal-dark hover:bg-teal-soft/50 font-bold gap-1.5"
          aria-label={installed ? `تحديث حزمة ${p.name}` : `التحقق من حزمة ${p.name}`}
        >
          {updating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {installed ? "تحديث" : "تحقق"}
        </Button>
      </div>
    </div>
  );
}

export function PackagesScreen({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["packages"], queryFn: api.packages });
  const packages = data?.packages ?? [];

  const refresh = useMutation({
    mutationFn: (p: PackageRow) => api.refreshPackage(p.key),
    onSuccess: (_res, p) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(`تم التحقق من حزمة «${p.name}» — المحتوى محدث`);
    },
    onError: () => toast.error("تعذر تحديث الحزمة — حاول مجددًا"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="حزم المحتوى" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        {isLoading ? (
          <div className="space-y-3" aria-label="جارٍ تحميل الحزم">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package size={40} className="mx-auto text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">لا توجد حزم محتوى معرفة حاليًا</p>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map((p) => (
              <PackageCard
                key={p.id}
                p={p}
                onRefresh={(x) => refresh.mutate(x)}
                refreshing={refresh.isPending && refresh.variables?.id === p.id}
              />
            ))}
          </div>
        )}

        {/* ✦ ملاحظة العمل دون إنترنت ✦ */}
        <div className={cn("bg-cream rounded-2xl p-4 flex items-start gap-2.5")}>
          <WifiOff size={17} className="text-gold-deep shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-ink/75 leading-relaxed">
            المحتوى المعتمد محمّل محليًا — يعمل التطبيق دون إنترنت.
          </p>
        </div>
      </main>
    </div>
  );
}
