"use client";

/**
 * overlay «النسخ الاحتياطي»
 * تصدير بيانات المستخدم / نسخة كاملة (إدارة) / استعادة من ملف JSON.
 * النص القرآني المرجعي لا يتأثر أبدًا بالاستعادة.
 */
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  FileDown,
  DatabaseBackup,
  Upload,
  TriangleAlert,
} from "lucide-react";

import { api } from "@/lib/api";
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

/** تنزيل JSON عبر Blob + رابط مؤقت */
function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function BackupScreen({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFileName, setRestoreFileName] = useState<string | null>(null);

  const exportUserData = useMutation({
    mutationFn: api.admin.exportUserData,
    onSuccess: (res) => {
      downloadJson("noor-user-data.json", res.data);
      toast.success("صُدّرت بياناتك بنجاح — تحقق من مجلد التنزيلات");
    },
    onError: () => toast.error("تعذر تصدير البيانات — حاول مجددًا"),
  });

  const fullBackup = useMutation({
    mutationFn: api.admin.backup,
    onSuccess: (res) => {
      downloadJson("noor-backup.json", res.data);
      toast.success("أُنشئت النسخة الاحتياطية الكاملة");
    },
    onError: () => toast.error("تعذر إنشاء النسخة الكاملة — حاول مجددًا"),
  });

  const restore = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.admin.restore({ data }),
    onSuccess: () => {
      // تحديث شامل لكل البيانات بعد الاستعادة
      queryClient.invalidateQueries();
      toast.success("تمت الاستعادة بنجاح — استُعيدت بياناتك");
      setRestoreFileName(null);
    },
    onError: () => toast.error("فشلت الاستعادة — تأكد أن الملف نسخة صحيحة من نور الهدى"),
  });

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return;
    setRestoreFileName(file.name);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      restore.mutate(parsed);
    } catch {
      toast.error("ملف غير صالح — اختر ملف JSON صحيحًا");
      setRestoreFileName(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto nice-scrollbar">
      <OverlayHeader title="النسخ الاحتياطي" onClose={onClose} />

      <main className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed px-1">
          احتفظ بنسخة من بياناتك (المفضلة، العلامات، الأوراد، الإعدادات) أو انقلها إلى جهاز آخر.
        </p>

        {/* ✦ تصدير بيانات المستخدم ✦ */}
        <section className="bg-card rounded-2xl p-4 space-y-3 shadow-sm anim-fade-up">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
              <FileDown size={19} strokeWidth={1.9} />
            </span>
            <div className="flex-1">
              <p className="font-bold text-ink text-[15px]">تصدير بيانات المستخدم</p>
              <p className="text-xs text-muted-foreground mt-0.5">المفضلة والعلامات والأوراد والإعدادات (noor-user-data.json).</p>
            </div>
          </div>
          <Button
            onClick={() => exportUserData.mutate()}
            disabled={exportUserData.isPending}
            variant="outline"
            className="w-full h-11 rounded-xl border-teal-soft text-teal-dark hover:bg-teal-soft/50 font-bold"
          >
            {exportUserData.isPending ? "جارٍ التصدير…" : "تصدير البيانات"}
          </Button>
        </section>

        {/* ✦ نسخة كاملة (إدارة) ✦ */}
        <section className="bg-card rounded-2xl p-4 space-y-3 shadow-sm anim-fade-up">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
              <DatabaseBackup size={19} strokeWidth={1.9} />
            </span>
            <div className="flex-1">
              <p className="font-bold text-ink text-[15px]">نسخة احتياطية كاملة (إدارة)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                تشمل المحتوى الثقافي والأقسام والكتب — للمشرفين (noor-backup.json).
              </p>
            </div>
          </div>
          <Button
            onClick={() => fullBackup.mutate()}
            disabled={fullBackup.isPending}
            variant="outline"
            className="w-full h-11 rounded-xl border-teal-soft text-teal-dark hover:bg-teal-soft/50 font-bold"
          >
            {fullBackup.isPending ? "جارٍ إنشاء النسخة…" : "إنشاء نسخة كاملة"}
          </Button>
        </section>

        {/* ✦ الاستعادة ✦ */}
        <section className="bg-card rounded-2xl p-4 space-y-3 shadow-sm anim-fade-up">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-teal-soft text-teal-dark flex items-center justify-center shrink-0">
              <Upload size={19} strokeWidth={1.9} />
            </span>
            <div className="flex-1">
              <p className="font-bold text-ink text-[15px]">استعادة</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                اختر ملف نسخة سابق بصيغة JSON لإعادة بياناتك.
                {restoreFileName && (
                  <span className="block mt-1 text-teal-dark font-medium" dir="ltr">
                    {restoreFileName}
                  </span>
                )}
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="اختيار ملف النسخة الاحتياطية"
            onChange={(e) => {
              onFilePicked(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={restore.isPending}
            className="w-full h-11 rounded-xl bg-header-gradient hover:opacity-95 text-white font-bold"
          >
            {restore.isPending ? "جارٍ الاستعادة…" : "اختيار ملف واستعادة"}
          </Button>
        </section>

        {/* ✦ تحذير ✦ */}
        <div
          role="alert"
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-start gap-2.5"
        >
          <TriangleAlert size={18} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
            الاستعادة تستبدل المفضلة والعلامات — النص القرآني المرجعي لا يتأثر أبدًا.
          </p>
        </div>
      </main>
    </div>
  );
}
