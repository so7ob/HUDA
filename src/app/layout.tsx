import type { Metadata, Viewport } from "next";
import { Tajawal, Amiri, Amiri_Quran } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";

// خطوط عربية مرخصة (OFL) — تُستضاف محليًا تلقائيًا
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-ui",
});
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-book",
});
const amiriQuran = Amiri_Quran({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-quran",
});

export const metadata: Metadata = {
  title: "نور الهدى — القرآن والمكتبة والورود",
  description:
    "تطبيق قرآني وثقافي متكامل: القرآن الكريم برسم المصحف، التفسير، الفهرس الموضوعي، المكتبة الثقافية، الأدعية، التلاوات، والبرنامج اليومي. هوية مستقلة.",
  applicationName: "نور الهدى",
  authors: [{ name: "فريق نور الهدى" }],
  keywords: ["قرآن", "مصحف", "تفسير", "مكتبة", "أدعية", "ورود", "تلاوات"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/huda/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/huda/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/huda/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/huda/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "نور الهدى", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#329B9C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${tajawal.variable} ${amiri.variable} ${amiriQuran.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors dir="rtl" />
        </ThemeProvider>
      </body>
    </html>
  );
}
