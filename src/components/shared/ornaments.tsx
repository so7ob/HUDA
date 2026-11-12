/**
 * زخارف إسلامية أصلية (مرسومة خصيصًا لهوية «نور الهدى»)
 * - OrnamentHeaderBox: صندوق قشكي بعناوين مزخرفة (عناوين الأقسام كما في التصميم المرجعي)
 * - Flourish: زخرفة جانبية
 * - AyahNumber: دائرة رقم الآية المزخرفة
 * - CornerOrnament: زوايا المصحف
 */
export function Flourish({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 84 28"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M1 14h20" opacity=".55" />
        <path d="M26 14c4-7 10-9 14-9 3 0 6 2 6 4.5S43.5 14 41 14" />
        <path d="M26 14c4 7 10 9 14 9 3 0 6-2 6-4.5S43.5 14 41 14" />
        <circle cx="49" cy="14" r="2.6" />
        <path d="M54 14c2.5 0 4-1.4 5.5-3M54 14c2.5 0 4 1.4 5.5 3" />
        <path d="M63 9l4.5 5L63 19" opacity=".8" />
        <path d="M72 7l6 7-6 7" opacity=".45" />
      </g>
      <circle cx="81" cy="14" r="1.6" fill="currentColor" opacity=".5" />
    </svg>
  );
}

/**
 * صندوق العناوين القشكي المزخرف — يطابق فكرة التصميم المرجعي بأصول أصلية
 */
export function OrnamentHeaderBox({
  title,
  className,
  titleClass,
}: {
  title: string;
  className?: string;
  titleClass?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center gap-2 ${className ?? ""}`}>
      <Flourish className="w-16 shrink-0 text-gold-deep/70" flip />
      <div
        className="surah-frame px-6 py-2.5 flex-1 max-w-md"
        style={{ borderRadius: 999 }}
      >
        <h2 className={`font-book text-xl md:text-2xl text-center text-ink/90 ${titleClass ?? ""}`}>
          {title}
        </h2>
      </div>
      <Flourish className="w-16 shrink-0 text-gold-deep/70" />
    </div>
  );
}

/** رقم آية داخل دائرة مزخرفة */
export function AyahNumber({ n, size = 30 }: { n: number; size?: number }) {
  const digits = String(n);
  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
      aria-label={`آية ${digits}`}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 text-gold-deep/80" fill="none">
        <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="20" cy="20" r="13.5" stroke="currentColor" strokeWidth="0.8" opacity=".6" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = 20 + Math.cos(a) * 17;
          const y1 = 20 + Math.sin(a) * 17;
          const x2 = 20 + Math.cos(a) * 20;
          const y2 = 20 + Math.sin(a) * 20;
          return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} stroke="currentColor" strokeWidth="1.2" />;
        })}
      </svg>
      <span className="relative font-book text-[0.68rem] text-gold-deep" style={{ fontSize: size * 0.42 }}>
        {toArabicDigits(digits)}
      </span>
    </span>
  );
}

/** تحويل الأرقام إلى الأرقام العربية المشرقية */
export function toArabicDigits(input: string | number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(input).replace(/\d/g, (d) => map[Number(d)]);
}

/** إطار زخرفي لرأس المصحف (بسملة / اسم السورة) */
export function MushafHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-3 my-4">
      <div className="surah-frame px-4 py-3">
        <div className="absolute -inset-x-1 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
          <span className="text-gold-deep/80">✦</span>
          <span className="text-gold-deep/80">✦</span>
        </div>
        {children}
      </div>
    </div>
  );
}
