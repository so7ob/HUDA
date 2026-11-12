"use client";

/**
 * قائمة إجراءات الآية — Bottom Sheet بكل الفعل المطلوبة:
 * تشغيل، تكرار، تفسير، نسخ، مشاركة، مفضلة، علامة مرجعية،
 * بداية/نهاية ورد، الانتقال إلى الآية.
 */
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Play, Repeat, BookOpenText, Copy, Share2, Heart, BookmarkPlus, Flag, Crosshair, Repeat1 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { toArabicDigits } from "@/components/shared/ornaments";

interface AyahRef {
  id: number;
  surah: number;
  numberInSurah: number;
  text: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ayah: AyahRef | null;
  surahName?: string;
  onPlayAyah: () => void;
  onShowTafsir: () => void;
  onCopy: () => void;
  onShare: () => void;
  wirdStart: { id: number; label: string } | null;
  wirdEnd: { id: number; label: string } | null;
  setWirdStart: (v: { id: number; surah: number; numberInSurah: number; label: string } | null) => void;
  setWirdEnd: (v: { id: number; surah: number; numberInSurah: number; label: string } | null) => void;
}

export function AyahActionsSheet({
  open,
  onOpenChange,
  ayah,
  surahName,
  onPlayAyah,
  onShowTafsir,
  onCopy,
  onShare,
  setWirdStart,
  setWirdEnd,
}: Props) {
  const setPlayer = useAppStore((s) => s.setPlayer);
  const player = useAppStore((s) => s.player);
  const [isFav, setIsFav] = useState(false);

  const label = ayah ? `سورة ${surahName} — آية ${toArabicDigits(ayah.numberInSurah)}` : "";

  useEffect(() => {
    if (!ayah) return;
    api.favorites().then((d) => {
      setIsFav(d.favorites.some((f) => f.kind === "ayah" && f.refKey === `ayah:${ayah.id}`));
    }).catch(() => undefined);
  }, [ayah, open]);

  if (!ayah) return null;

  const actions: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }[] = [
    {
      icon: Play,
      label: "تشغيل الآية",
      onClick: () => {
        onPlayAyah();
        onOpenChange(false);
      },
    },
    {
      icon: Repeat,
      label: "تكرار الآية",
      onClick: () => {
        setPlayer({ playing: true, ayahId: ayah.id, surah: ayah.surah, ayahInSurah: ayah.numberInSurah, repeatMode: "ayah", repeatCount: 3, visible: true });
        toast("سيتم تكرار الآية ٣ مرات");
        onOpenChange(false);
      },
      active: player.repeatMode === "ayah" && player.ayahId === ayah.id,
    },
    {
      icon: Repeat1,
      label: "إيقاف التكرار",
      onClick: () => {
        setPlayer({ repeatMode: "off" });
        toast("أُلغي التكرار");
      },
    },
    { icon: BookOpenText, label: "التفسير", onClick: () => onShowTafsir() },
    { icon: Copy, label: "نسخ", onClick: () => { onCopy(); onOpenChange(false); } },
    { icon: Share2, label: "مشاركة", onClick: () => { onShare(); onOpenChange(false); } },
    {
      icon: Heart,
      label: isFav ? "إزالة من المفضلة" : "إضافة للمفضلة",
      active: isFav,
      onClick: async () => {
        if (isFav) {
          await api.removeFavorite("ayah", `ayah:${ayah.id}`);
          setIsFav(false);
          toast("أُزيلت من المفضلة");
        } else {
          await api.addFavorite("ayah", `ayah:${ayah.id}`, label, ayah.text.slice(0, 140));
          setIsFav(true);
          toast.success("أُضيفت إلى المفضلة");
        }
      },
    },
    {
      icon: BookmarkPlus,
      label: "علامة مرجعية",
      onClick: async () => {
        await api.addBookmark("ayah", `ayah:${ayah.id}`, label);
        toast.success("أُضيفت علامة مرجعية");
        onOpenChange(false);
      },
    },
    {
      icon: Flag,
      label: "بداية الورد",
      onClick: () => {
        setWirdStart({ id: ayah.id, surah: ayah.surah, numberInSurah: ayah.numberInSurah, label: `${surahName} ${ayah.numberInSurah}` });
        toast(`حددت بداية الورد: ${surahName} ${ayah.numberInSurah}`);
        onOpenChange(false);
      },
    },
    {
      icon: Flag,
      label: "نهاية الورد",
      onClick: () => {
        setWirdEnd({ id: ayah.id, surah: ayah.surah, numberInSurah: ayah.numberInSurah, label: `${surahName} ${ayah.numberInSurah}` });
        toast(`حددت نهاية الورد: ${surahName} ${ayah.numberInSurah}`);
        onOpenChange(false);
      },
    },
    {
      icon: Crosshair,
      label: "الانتقال إلى الآية",
      onClick: () => {
        document.getElementById(`ayah-${ayah.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        onOpenChange(false);
      },
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center font-book text-lg text-ink/90">{label}</DrawerTitle>
          <p className="text-center text-xs text-muted-foreground line-clamp-1 px-6">{ayah.text.slice(0, 90)}…</p>
        </DrawerHeader>
        <div className="grid grid-cols-3 gap-2 px-4 pb-8 pt-1">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors ${
                  a.active ? "bg-accent text-primary" : "bg-muted/60 hover:bg-accent text-ink/80"
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-medium leading-tight text-center px-1">{a.label}</span>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
