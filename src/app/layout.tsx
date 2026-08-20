import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nancy Finance - Quản lý tài chính cá nhân",
  description:
    "Nền tảng quản lý tài chính cá nhân thông minh, bảo mật, hiện đại cho người Việt.",
  applicationName: "Nancy Finance",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: "/icons/icon-192.png",
    apple: [
      {
        url: "/icons/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Nancy Finance",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
