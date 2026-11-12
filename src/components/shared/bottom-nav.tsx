"use client";

import { useAppStore, type Tab } from "@/lib/store";
import { Calendar, BookOpen, Settings, MoonStar } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * شريط التنقل السفلي المنحني — مستوحى من الفكرة البصرية للتصميم المرجعي
 * بتنفيذ أصلي: قناة وسطية مقعّرة + زر قرآن مرفوع
 */

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "plans", icon: Calendar, label: "البرنامج اليومي" },
  { id: "prophet", icon: MoonStar, label: "مع الرسول والرسالة" },
  { id: "quran", icon: BookOpen, label: "القرآن الكريم" }, // الزر المركزي
  { id: "library", icon: BookOpen, label: "المكتبة" },
  { id: "settings", icon: Settings, label: "الإعدادات" },
];

/** SVG القناة المنحنية في منتصف الشريط */
function CurvedBar() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 w-full h-[58px]"
      viewBox="0 0 360 58"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 20 C0 8 10 0 24 0 H336 C350 0 360 8 360 20 V58 H0 Z"
        fill="url(#navGrad)"
      />
      {/* القناة المقعّرة الوسطى */}
      <path
        d="M148 0 C152 14 162 24 180 24 C198 24 208 14 212 0 Z"
        fill="transparent"
      />
      <defs>
        <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--huda-teal)" />
          <stop offset="100%" stopColor="var(--huda-teal-dark)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BottomNav() {
  const { tab, setTab, overlay } = useAppStore();
  if (overlay.kind !== "none") return null;

  const side = TABS.filter((t) => t.id !== "quran");
  const left = side.slice(0, 2);
  const right = side.slice(2);

  const TabBtn = ({ t }: { t: (typeof TABS)[number] }) => {
    const Icon = t.icon;
    const active = tab === t.id;
    return (
      <button
        onClick={() => setTab(t.id)}
        className={cn(
          "relative z-10 flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 touch-target transition-colors",
          active ? "text-white" : "text-white/70 hover:text-white"
        )}
        aria-label={t.label}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
        <span className="text-[10px] leading-none font-medium">{t.label.split(" ")[0]}</span>
        {active && <span className="absolute -top-0.5 w-6 h-0.5 rounded-full bg-white/80" />}
      </button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="التنقل الرئيسي"
    >
      <div className="relative max-w-lg mx-auto">
        <div className="relative h-[58px]">
          <CurvedBar />
          <div className="absolute inset-0 flex items-center px-2 pb-1">
            {left.map((t) => (
              <TabBtn key={t.id} t={t} />
            ))}
            <span className="w-[76px] shrink-0" aria-hidden="true" />
            {right.map((t) => (
              <TabBtn key={t.id} t={t} />
            ))}
          </div>
          {/* زر القرآن المركزي المرفوع */}
          <button
            onClick={() => setTab("quran")}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6 w-[68px] h-[68px] rounded-full flex items-center justify-center transition-transform active:scale-95",
              "bg-header-gradient shadow-lg ring-4 ring-background/90",
              tab === "quran" ? "scale-105" : "opacity-95"
            )}
            aria-label="القرآن الكريم"
            aria-current={tab === "quran" ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white">
              <path d="M4 5.5C6.5 4.2 9 4.2 12 6c3-1.8 5.5-1.8 8-.5V18c-3-1.3-5.5-1.3-8 .5c-3-1.8-5.5-1.8-8-.5V5.5Z" strokeLinejoin="round" />
              <path d="M12 6v12.5" strokeLinecap="round" />
              <path d="M6.5 9c1.2-.4 2.3-.4 3.5 0M14 9c1.2-.4 2.3-.4 3.5 0" strokeLinecap="round" opacity=".7" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
