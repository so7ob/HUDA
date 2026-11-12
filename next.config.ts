import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* P0-AUDIT: أُزيل ignoreBuildErrors — أخطاء TypeScript لن تُخفى بعد الآن.
     الأسباب التي كانت مخفية (أصلحتها دورة التدقيق):
     - src/app/api/admin/chapters/[id]/route.ts: استخدامات requireAdmin/unauthorized بلا استيراد (انهيار 500 وقت التشغيل)
     - src/components/settings/admin-panel.tsx: وصول a.id على نوع بلا المعرف */
  reactStrictMode: true,
};

export default nextConfig;
