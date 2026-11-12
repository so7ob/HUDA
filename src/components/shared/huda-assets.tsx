"use client";

/**
 * عرض أصول «هدى الله» المرجعية (res.zip من المستودع المفتوح so7ob/HUDA)
 * مكوّن موحّد لصور الرموز مع دعم التلوين عبر فلاتر CSS:
 * - الرموز البيضاء على خلفيات فاتحة: brightness-0 (تحويلها إلى داكنة)
 * - الرموز الداكنة على خلفيات داكنة: dark:invert (تحويلها إلى بيضاء)
 */
import Image from "next/image";

export function HudaImg({
  src,
  size = 20,
  className,
  alt = "",
}: {
  src: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={`h-auto ${className ?? ""}`}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}

/** مسارات الأصول المعتمدة */
export const HUDA_ASSETS = {
  logo: "/huda/logo.png",
  pattern: "/huda/pattern-dark.png",
  player: {
    play: "/huda/player/play.png",
    pause: "/huda/player/pause.png",
    prev: "/huda/player/prev.png",
    next: "/huda/player/next.png",
    rewind: "/huda/player/rewind.png",
    forward: "/huda/player/forward.png",
    stop: "/huda/player/stop.png",
  },
  shapes: {
    dropletTeal: "/huda/shapes/droplet-teal.png",
    droplet: "/huda/shapes/droplet.png",
    dropletBig: "/huda/shapes/droplet-big.png",
    dropletSmall: "/huda/shapes/droplet-small.png",
    check: "/huda/shapes/check.png",
    checkSmall: "/huda/shapes/check-small.png",
    arrowOpen: "/huda/shapes/arrow-open.png",
    phone: "/huda/shapes/phone.png",
    video: "/huda/shapes/video.png",
    circleRing: "/huda/shapes/circle-ring.png",
    circleDot: "/huda/shapes/circle-dot.png",
    squareRing: "/huda/shapes/square-ring.png",
    record: "/huda/shapes/record.png",
    chevronDown: "/huda/shapes/chevron-down.png",
    divider: "/huda/shapes/divider.png",
  },
} as const;
