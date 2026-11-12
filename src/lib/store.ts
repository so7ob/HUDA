"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ============================================================
   متجر حالة «نور الهدى»
   - التنقل بين الشاشات (بديل Router في تجربة الجوال SPA)
   - إعدادات القراءة (تُحفظ محليًا وتُزامَن مع الخادم)
   - حالة المشغل الصوتي
   ============================================================ */

export type Tab = "plans" | "library" | "quran" | "prophet" | "settings";

export type Overlay =
  | { kind: "none" }
  | { kind: "reader"; surah: number; ayah?: number; page?: number }
  | { kind: "search" }
  | { kind: "book"; bookId: string; chapterId?: string }
  | { kind: "bookSection"; sectionKey: string }
  | { kind: "reciters" }
  | { kind: "notificationsSettings" }
  | { kind: "notificationsCenter" }
  | { kind: "downloads" }
  | { kind: "about" }
  | { kind: "backup" }
  | { kind: "packages" }
  | { kind: "admin" }
  | { kind: "favorites" }
  | { kind: "planEditor"; prefill?: { name?: string; targetType: string; targetRef: string; totalPages?: number; kind?: string } }
  | { kind: "topicAyahs"; topicId: string };

export interface ReaderPrefs {
  fontSize: number; // حجم خط الآيات (px)
  fontChoice: "quran" | "amiri";
  lineHeight: number; // التباعد
  mode: "list" | "mushaf";
  brightness: number; // سطوع خلفية القراءة 0..1
  showPageNumber: boolean;
  autoScrollSpeed: number; // px/s
}

export interface PlayerState {
  playing: boolean;
  ayahId: number | null; // الرقم العالمي
  surah: number;
  ayahInSurah: number;
  reciterId: string;
  repeatMode: "off" | "ayah" | "range";
  repeatCount: number;
  speed: number;
  rangeFrom: number | null; // بداية نطاق التكرار (ayahId)
  rangeTo: number | null;
  visible: boolean;
}

interface AppStore {
  tab: Tab;
  overlay: Overlay;
  readerPrefs: ReaderPrefs;
  player: PlayerState;
  userName: string;

  setTab: (t: Tab) => void;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  setReaderPrefs: (p: Partial<ReaderPrefs>) => void;
  setPlayer: (p: Partial<PlayerState>) => void;
  setUserName: (n: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      tab: "quran",
      overlay: { kind: "none" },
      readerPrefs: {
        fontSize: 26,
        fontChoice: "quran",
        lineHeight: 2.15,
        mode: "list",
        brightness: 0.5,
        showPageNumber: true,
        autoScrollSpeed: 40,
      },
      player: {
        playing: false,
        ayahId: null,
        surah: 1,
        ayahInSurah: 1,
        reciterId: "ar.alafasy",
        repeatMode: "off",
        repeatCount: 1,
        speed: 1,
        rangeFrom: null,
        rangeTo: null,
        visible: false,
      },
      userName: "عبدالله",

      setTab: (t) => set({ tab: t }),
      openOverlay: (o) => set({ overlay: o }),
      closeOverlay: () => set({ overlay: { kind: "none" } }),
      setReaderPrefs: (p) => set((s) => ({ readerPrefs: { ...s.readerPrefs, ...p } })),
      setPlayer: (p) => set((s) => ({ player: { ...s.player, ...p } })),
      setUserName: (n) => set({ userName: n }),
    }),
    {
      name: "noor-alhuda-store",
      partialize: (s) => ({
        readerPrefs: s.readerPrefs,
        player: { ...s.player, playing: false, visible: false },
        userName: s.userName,
        tab: s.tab,
      }),
    }
  )
);
