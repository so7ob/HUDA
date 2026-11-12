"use client";

/**
 * شاشة دخول لوحة الإدارة — مصادقة محلية بجلسة كوكي httpOnly.
 * الافتراضي الموثق عند أول تشغيل: admin / admin123 (يُطلب تغييره فورًا).
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Loader2, LockKeyhole, ShieldCheck, User } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => api.admin.login(username.trim(), password),
    onSuccess: (_r, _v) => {
      toast.success("مرحبًا بك — تم تسجيل الدخول");
      queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      onSuccess();
    },
    onError: (e: Error) => {
      setError(e.message.includes("401") || e.message.includes("غير مصرح") ? "بيانات الدخول غير صحيحة" : e.message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("أدخل اسم المستخدم وكلمة المرور");
      return;
    }
    login.mutate();
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-10" dir="rtl">
      <div className="w-full max-w-sm">
        {/* ترويسة الهوية */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-header-gradient shadow-lg flex items-center justify-center anim-fade-up">
            <ShieldCheck size={30} className="text-white" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h1 className="font-ui font-bold text-xl text-ink mt-4">لوحة الإدارة</h1>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            منطقة محمية — إدارة المحتوى وسير النشر والإعدادات
          </p>
        </div>

        <form onSubmit={submit} className="bg-card rounded-3xl p-6 shadow-sm border border-border/60 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="admin-username" className="flex items-center gap-1.5">
              <User size={14} aria-hidden="true" />
              اسم المستخدم
            </Label>
            <Input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11"
              autoComplete="username"
              dir="ltr"
              placeholder="admin"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="flex items-center gap-1.5">
              <KeyRound size={14} aria-hidden="true" />
              كلمة المرور
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
              autoComplete="current-password"
              dir="ltr"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="w-full h-12 rounded-xl bg-header-gradient hover:opacity-95 font-bold text-base gap-2"
          >
            {login.isPending ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={17} />}
            {login.isPending ? "جارٍ التحقق…" : "تسجيل الدخول"}
          </Button>
        </form>

        {/* تلميح الحساب الافتراضي */}
        <div className="mt-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl px-4 py-3">
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            <span className="font-bold">أول تشغيل؟</span> الحساب الافتراضي{" "}
            <span dir="ltr" className="font-ui font-bold">
              admin / admin123
            </span>{" "}
            — غيّر كلمة المرور من أيقونة المفتاح بعد الدخول.
          </p>
        </div>
      </div>
    </div>
  );
}
