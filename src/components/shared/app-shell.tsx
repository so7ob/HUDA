"use client";

/**
 * غلاف التطبيق «نور الهدى» — نقطة التجميع الوحيدة
 * يدير: التبويبات الخمسة، الشاشات المنبثقة، المشغل الصوتي،
 * وجدولة التذكيرات المحلية.
 */
import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { QuranHome } from "@/components/quran/quran-home";
import { ReaderScreen } from "@/components/quran/reader";
import { LibraryScreen } from "@/components/library/library-screen";
import { BookSectionScreen } from "@/components/library/book-section";
import { BookDetailScreen } from "@/components/library/book-detail";
import { BookReaderScreen } from "@/components/library/book-reader";
import { ProphetScreen } from "@/components/prophet/prophet-screen";
import { PlansScreen } from "@/components/plans/plans-screen";
import { PlanEditorScreen } from "@/components/plans/plan-editor";
import { SearchScreen } from "@/components/search/search-screen";
import { FavoritesScreen } from "@/components/shared/favorites-screen";
import { TopicAyahsScreen } from "@/components/quran/topic-ayahs";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { RecitersScreen } from "@/components/settings/reciters-screen";
import { NotificationsSettingsScreen } from "@/components/settings/notifications-settings";
import { NotificationsCenterScreen } from "@/components/settings/notifications-center";
import { DownloadsScreen } from "@/components/settings/downloads-screen";
import { AboutScreen } from "@/components/settings/about-screen";
import { BackupScreen } from "@/components/settings/backup-screen";
import { PackagesScreen } from "@/components/settings/packages-screen";
import { AdminPanelScreen } from "@/components/settings/admin-panel";

import { AudioEngine } from "@/components/player/audio-engine";
import { MiniPlayer } from "@/components/player/player-sheet";
import { BottomNav } from "@/components/shared/bottom-nav";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
  },
});

/** جدولة التذكيرات المحلية — تعمل دون إنترنت أثناء فتح التطبيق */
function useNotificationScheduler() {
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const check = async () => {
      try {
        const { notifications } = await api.notifications();
        const now = Date.now();
        for (const n of notifications) {
          if (n.isRead) continue;
          const fireAt = n.fireAt ? new Date(n.fireAt).getTime() : null;
          if (fireAt && fireAt <= now && !firedRef.current.has(n.id)) {
            firedRef.current.add(n.id);
            await api.markNotificationRead(n.id);
            toast(n.title, { description: n.body, duration: 8000 });
            // إشعار نظام إن سمح المستخدم
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(n.title, { body: n.body, dir: "rtl", lang: "ar" });
            }
          }
        }
        // تذكيرات الأوراد: هل حان وقت ورد لم يُنجز اليوم؟
        const { plans } = await api.plans();
        const planNow = new Date();
        const hhmm = `${String(planNow.getHours()).padStart(2, "0")}:${String(planNow.getMinutes()).padStart(2, "0")}`;
        const today = planNow.toISOString().slice(0, 10);
        for (const p of plans) {
          if (p.status !== "active" || !p.reminderTime) continue;
          const key = `plan:${p.id}:${today}`;
          if (firedRef.current.has(key)) continue;
          if (hhmm >= p.reminderTime && !p.todayDone) {
            firedRef.current.add(key);
            toast(`حان وقت وردك: ${p.name}`, { description: `${p.targetLabel ?? ""} — اضغط «إنجاز» بعد القراءة`, duration: 10000 });
            await api.createNotification({
              title: `تذكير الورد: ${p.name}`,
              body: `${p.targetLabel ?? ""} — وردك اليوم في انتظارك`,
              kind: "reminder",
              fireAt: new Date().toISOString(),
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`تذكير الورد: ${p.name}`, { body: p.targetLabel ?? "", dir: "rtl", lang: "ar" });
            }
          }
        }
      } catch {
        /* الشبكة غير متاحة — التذكيرات المحلية تكمل عند توافرها */
      }
    };
    check();
    timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);
}

function ShellContent() {
  const { tab, overlay, closeOverlay } = useAppStore();
  useNotificationScheduler();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {tab === "quran" && <QuranHome />}
      {tab === "library" && <LibraryScreen />}
      {tab === "prophet" && <ProphetScreen />}
      {tab === "plans" && <PlansScreen />}
      {tab === "settings" && <SettingsScreen />}

      {/* الشاشات المنبثقة */}
      {overlay.kind === "reader" && (
        <ReaderScreen
          surah={overlay.surah}
          ayah={overlay.ayah}
          page={overlay.page}
          onClose={closeOverlay}
        />
      )}
      {overlay.kind === "search" && <SearchScreen onClose={closeOverlay} />}
      {overlay.kind === "book" && (
        <BookDetailScreen bookId={overlay.bookId} onClose={closeOverlay} />
      )}
      {overlay.kind === "book" && overlay.chapterId && (
        <BookReaderScreen bookId={overlay.bookId} chapterId={overlay.chapterId} onClose={closeOverlay} />
      )}
      {overlay.kind === "bookSection" && (
        <BookSectionScreen sectionKey={overlay.sectionKey} onClose={closeOverlay} />
      )}
      {overlay.kind === "favorites" && <FavoritesScreen onClose={closeOverlay} />}
      {overlay.kind === "topicAyahs" && <TopicAyahsScreen topicId={overlay.topicId} onClose={closeOverlay} />}
      {overlay.kind === "planEditor" && (
        <PlanEditorScreen prefill={overlay.prefill} onClose={closeOverlay} />
      )}
      {overlay.kind === "reciters" && <RecitersScreen onClose={closeOverlay} />}
      {overlay.kind === "notificationsSettings" && <NotificationsSettingsScreen onClose={closeOverlay} />}
      {overlay.kind === "notificationsCenter" && <NotificationsCenterScreen onClose={closeOverlay} />}
      {overlay.kind === "downloads" && <DownloadsScreen onClose={closeOverlay} />}
      {overlay.kind === "about" && <AboutScreen onClose={closeOverlay} />}
      {overlay.kind === "backup" && <BackupScreen onClose={closeOverlay} />}
      {overlay.kind === "packages" && <PackagesScreen onClose={closeOverlay} />}
      {overlay.kind === "admin" && <AdminPanelScreen onClose={closeOverlay} />}

      {/* المشغل الصوتي والتنقل */}
      <AudioEngine />
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

export function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShellContent />
    </QueryClientProvider>
  );
}
