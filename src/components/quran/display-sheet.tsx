"use client";

/**
 * ورقة «كيفية العرض» — كما في التصميم المرجعي:
 * قائمة/مصحف، حجم الخط، الخط، التباعد، السطوع، إظهار رقم الصفحة،
 * الوضع الليلي، سرعة التمرير التلقائي.
 */
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useAppStore } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Sun, Moon, BookOpen, List, ALargeSmall } from "lucide-react";
import { cn } from "@/lib/utils";

export function DisplaySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { readerPrefs: prefs, setReaderPrefs } = useAppStore();
  const { theme, setTheme } = useTheme();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader className="pb-1">
          <DrawerTitle className="text-center text-lg font-bold">كيفية العرض</DrawerTitle>
        </DrawerHeader>

        <div className="px-5 pb-8 space-y-5">
          {/* طريقة العرض */}
          <div className="flex gap-2">
            {(
              [
                ["list", "قائمة", List],
                ["mushaf", "مصف", BookOpen],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setReaderPrefs({ mode: id })}
                className={cn(
                  "flex-1 rounded-2xl py-3 flex items-center justify-center gap-2 transition-all font-bold",
                  prefs.mode === id ? "bg-primary text-white shadow" : "bg-muted/70 text-muted-foreground"
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {/* حجم الخط */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium flex items-center gap-1.5"><ALargeSmall size={16} /> حجم الخط</span>
              <span className="text-xs text-muted-foreground">{prefs.fontSize}px</span>
            </div>
            <Slider
              value={[prefs.fontSize]}
              min={18}
              max={44}
              step={2}
              onValueChange={([v]) => setReaderPrefs({ fontSize: v })}
            />
            {/* معاينة */}
            <p className="font-quran text-center mt-2 text-ink/80" style={{ fontSize: prefs.fontSize * 0.6, lineHeight: prefs.lineHeight }}>
              إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا
            </p>
          </div>

          {/* اختيار الخط */}
          <div>
            <span className="text-sm font-medium">الخط</span>
            <div className="flex gap-2 mt-1.5">
              {(
                [
                  ["quran", "مصحفي (أميري قرآن)"],
                  ["amiri", "أميري (للكتب)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setReaderPrefs({ fontChoice: id })}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-sm border transition-all",
                    prefs.fontChoice === id ? "border-primary bg-accent text-primary font-bold" : "border-border text-muted-foreground"
                  )}
                >
                  <span className={id === "quran" ? "font-quran" : "font-book"}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* التباعد */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">تباعد الأسطر</span>
              <span className="text-xs text-muted-foreground">{prefs.lineHeight.toFixed(2)}</span>
            </div>
            <Slider value={[prefs.lineHeight]} min={1.6} max={3} step={0.05} onValueChange={([v]) => setReaderPrefs({ lineHeight: v })} />
          </div>

          {/* سطوع الخلفية */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">سطوع خلفية القراءة</span>
              <span className="text-xs text-muted-foreground">{Math.round(prefs.brightness * 100)}٪</span>
            </div>
            <Slider value={[prefs.brightness]} min={0} max={1} step={0.05} onValueChange={([v]) => setReaderPrefs({ brightness: v })} />
          </div>

          {/* سرعة التمرير التلقائي */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">سرعة التمرير التلقائي</span>
              <span className="text-xs text-muted-foreground">{prefs.autoScrollSpeed} بكسل/ث</span>
            </div>
            <Slider value={[prefs.autoScrollSpeed]} min={10} max={120} step={5} onValueChange={([v]) => setReaderPrefs({ autoScrollSpeed: v })} />
          </div>

          {/* مفاتيح */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">إظهار رقم الصفحة</span>
            <Switch checked={prefs.showPageNumber} onCheckedChange={(v) => setReaderPrefs({ showPageNumber: v })} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1.5">
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              الوضع الليلي
            </span>
            <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
