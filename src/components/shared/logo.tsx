/**
 * شعار «نور الهدى» الأصلي — مصحف مفتوح تنبعث منه شعاع نور
 * زخرفة أصلية مستقلة (لا تُنسب لأي علامة تجارية).
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* الشعاع */}
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M32 4v9" />
        <path d="M18 9l4 7.5" />
        <path d="M46 9l-4 7.5" />
      </g>
      {/* هلال النور */}
      <path
        d="M27.5 22.5a7.5 7.5 0 0 0 9 0a8.6 8.6 0 1 1-9 0Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* المصحف المفتوح */}
      <path
        d="M6 38c8-4.5 16-4.5 24 0c8-4.5 16-4.5 24 0v16c-8-4.5-16-4.5-24 0c-8-4.5-16-4.5-24 0V38Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M6 38c8-4.5 16-4.5 24 0c8-4.5 16-4.5 24 0"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M32 39.5v13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {/* سطور الصفحات */}
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.75">
        <path d="M12 43.5c5-2.2 9.5-2.4 14-.6" />
        <path d="M12 48.5c5-2.2 9.5-2.4 14-.6" />
        <path d="M52 43.5c-5-2.2-9.5-2.4-14-.6" />
        <path d="M52 48.5c-5-2.2-9.5-2.4-14-.6" />
      </g>
    </svg>
  );
}

/** شعار مربع بلون العلامة */
export function LogoBadge({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-header-gradient text-white shadow-md ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <LogoMark size={size * 0.66} />
    </span>
  );
}
