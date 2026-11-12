"use client";

/**
 * overlay «التنزيلات» — إدارة التلاوات المحمّلة فعليًا على الجهاز (Issue #9)
 * - كل سجل يمثل سورة منزّلة كاملة (MP3 لكل آية في IndexedDB)
 * - إجمالي الحجم الحقيقي + استهلاك تخزين المتصفح
 * - حذف فردي (سجّل + ملفات الآيات) وحذف الكل (بتأكيد)
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Trash2, Download, AudioLines, HardDrive, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { ayahIdsForSurah, ayahKey, deleteAyahKeys, clearAyahStore, getSurahStoredInfo, storageEstimate } from "@/lib/audio-store";
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
  const { data: surahsData } = useQuery({ queryKey: ["surahs"], queryFn: api.surahs, staleTime: Infinity });
  const downloads = data?.downloads ?? [];
  const surahs = surahsData?.surahs ?? [];
  const totalBytes = downloads.reduce((sum, d) => sum + d.sizeBytes, 0);

  /** تخزين المتصفح الفعلي (usage/quota) */
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    let alive = true;
    void storageEstimate().then((e) => {
      if (alive) setEstimate(e);
    });
    return () => {
      alive = false;
    };
  }, [downloads]);

  /** عدد الملفات الفعلية لكل سجل في المخزن المحلي — كشف السجلات القديمة بلا ملفات */
  const [storeInfo, setStoreInfo] = useState<Record<string, { stored: number; bytes: number }> | null>(null);
  const scanning = storeInfo === null;
  useEffect(() => {
    let alive = true;
    void (async () => {
      const entries: Record<string, { stored: number; bytes: number }> = {};
      for (const d of downloads) {
        const info = await getSurahStoredInfo(d.reciterId, ayahIdsForSurah(surahs, d.surah));
        entries[`${d.reciterId}:${d.surah}`] = info;
      }
      if (alive) setStoreInfo(entries);
    })();
    return () => {
      alive = false;
    };
  }, [downloads, surahs]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["downloads"] });
  };

  /** حذف فردي: ملفات الآيات من IndexedDB ثم السجل من الخادم */
  const remove = useMutation({
    mutationFn: async (args: { id: string; reciterId: string; surah: number; surahName: string }) => {
      await deleteAyahKeys(ayahIdsForSurah(surahs, args.surah).map((aid) => ayahKey(args.reciterId, aid)));
      await api.removeDownload(args.id);
    },
    onSuccess: (_res, args) => {
      invalidate();
      toast.success(`حُذفت تلاوة سورة ${args.surahName} وملفاتها من الجهاز`);
    },
    onError: () => toast.error("تعذر حذف التنزيل — حاول مجددًا"),
  });

  /** حذف الكل: تفريغ المخزن بالكامل + كل السجلات (بتأكيد خطوتين) */
  const [confirmAll, setConfirmAll] = useState(false);
  const removeAll = useMutation({
    mutationFn: async () => {
      await clearAyahStore();
      await api.clearDownloads();
    },
    onSuccess: () => {
      invalidate();
      setConfirmAll(false);
      toast.success("حُذفت جميع التنزيلات وملفاتها من الجهاز");
    },
    onError: () => toast.error("تعذر حذف التنزيلات — حاول مجددًا"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="التنزيلات" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        {/* ✦ إجمالي الحجم + استهلاك التخزين ✦ */}
        <section
          aria-label="إجمالي التنزيلات"
          className="bg-header-gradient text-white rounded-3xl p-5 shadow-md anim-fade-up"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/85">الحجم المحمّل فعليًا</p>
              <p className="text-2xl font-bold mt-1">{formatSize(totalBytes)}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-white/85">عدد السور</p>
              <p className="text-2xl font-bold mt-1">{toArabicDigits(downloads.length)}</p>
            </div>
          </div>
          {estimate && estimate.quota > 0 && (
            <div className="mt-4 pt-3 border-t border-white/15" aria-label="استهلاك تخزين المتصفح">
              <div className="flex items-center justify-between text-xs text-white/85">
                <span className="flex items-center gap-1.5">
                  <HardDrive size={13} /> تخزين المتصفح المستخدم
                </span>
                <span>
                  {formatSize(estimate.usage)} من {formatSize(estimate.quota)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))}%` }}
                />
              </div>
            </div>
          )}
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
              لا توجد تنزيلات — نزّل السور من مشغل التلاوات لتسمعها دون إنترنت
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* حذف الكل */}
            <div className="flex justify-end">
              {confirmAll ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">تُحذف كل الملفات من الجهاز — متأكد؟</span>
                  <button
                    onClick={() => removeAll.mutate()}
                    disabled={removeAll.isPending}
                    className="rounded-full bg-destructive text-white px-3 py-1.5 font-bold hover:bg-destructive/90 transition-colors"
                  >
                    {removeAll.isPending ? <Loader2 size={13} className="animate-spin" /> : "نعم، حذف الكل"}
                  </button>
                  <button
                    onClick={() => setConfirmAll(false)}
                    className="rounded-full bg-muted px-3 py-1.5 font-medium hover:bg-muted/70 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAll(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive rounded-full px-3 py-1.5 hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} /> حذف كل التنزيلات
                </button>
              )}
            </div>

            {downloads.map((d) => {
              const info = storeInfo?.[`${d.reciterId}:${d.surah}`] ?? { stored: 0, bytes: 0 };
              const storedCount = info.stored;
              const realBytes = storedCount > 0 ? info.bytes : d.sizeBytes;
              return (
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
                    {scanning ? (
                      <p className="text-xs text-muted-foreground mt-1">جارٍ فحص الملفات المحلية…</p>
                    ) : storedCount === 0 ? (
                      <p className="text-xs text-amber-600 mt-1">سجل قديم بلا ملفات محلية — أعد التنزيل لتشغيله دون شبكة</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        {toArabicDigits(storedCount)} ملف محليًا · {formatSize(realBytes)}
                        {storedCount < d.ayahCount ? ` · ناقص (${toArabicDigits(d.ayahCount - storedCount)})` : " · كاملة"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove.mutate({ id: d.id, reciterId: d.reciterId, surah: d.surah, surahName: d.surahName })}
                    disabled={remove.isPending}
                    aria-label={`حذف تلاوة سورة ${d.surahName} بصوت ${d.reciterName} وملفاتها`}
                    className="touch-target flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 active:scale-95 transition-all shrink-0"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
