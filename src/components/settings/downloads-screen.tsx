"use client";

/**
 * overlay «التنزيلات» — إدارة التلاوات المحملة محليًا
 * إجمالي الحجم + حذف فردي + حالة فراغ واضحة.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Trash2, Download, AudioLines } from "lucide-react";

import { api } from "@/lib/api";
import { toArabicDigits } from "@/components/shared/ornaments";
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

/** الحجم بصيغة مقروءة: بايت → م.ب */
function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function DownloadsScreen({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["downloads"], queryFn: api.downloads });
  const downloads = data?.downloads ?? [];
  const totalBytes = downloads.reduce((sum, d) => sum + d.sizeBytes, 0);

  const remove = useMutation({
    mutationFn: (args: { id: string; surahName: string }) => api.removeDownload(args.id),
    onSuccess: (_res, args) => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      toast.success(`حُذفت تلاوة سورة ${args.surahName}`);
    },
    onError: () => toast.error("تعذر حذف التنزيل — حاول مجددًا"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="التنزيلات" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        {/* ✦ إجمالي الحجم ✦ */}
        <section
          aria-label="إجمالي التنزيلات"
          className="bg-header-gradient text-white rounded-3xl p-5 flex items-center justify-between shadow-md anim-fade-up"
        >
          <div>
            <p className="text-sm text-white/85">إجمالي الحجم المحمل</p>
            <p className="text-2xl font-bold mt-1">{formatSize(totalBytes)}</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-white/85">عدد السور</p>
            <p className="text-2xl font-bold mt-1">{toArabicDigits(downloads.length)}</p>
          </div>
        </section>

        {isLoading ? (
          <div className="space-y-3" aria-label="جارٍ تحميل التنزيلات">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Download size={40} className="mx-auto text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              لا توجد تنزيلات — نزّل السور من مشغل التلاوات
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloads.map((d) => (
              <div
                key={d.id}
                className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm anim-fade-up"
              >
                <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
                  <AudioLines size={19} strokeWidth={1.9} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-[15px] truncate">
                    سورة {d.surahName} — {d.reciterName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {toArabicDigits(d.ayahCount)} آية · {formatSize(d.sizeBytes)}
                  </p>
                </div>
                <button
                  onClick={() => remove.mutate({ id: d.id, surahName: d.surahName })}
                  disabled={remove.isPending}
                  aria-label={`حذف تلاوة سورة ${d.surahName} بصوت ${d.reciterName}`}
                  className="touch-target flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 active:scale-95 transition-all shrink-0"
                >
                  <Trash2 size={19} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
