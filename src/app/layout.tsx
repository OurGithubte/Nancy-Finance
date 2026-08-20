import type { Metadata, Viewport } from "next";
import "./globals.css";

const brandIcon = "/branding/nancy-finance-mark-v3.svg";

export const metadata: Metadata = {
  title: "Nancy Finance - Quản lý tài chính cá nhân",
  description:
    "Nền tảng quản lý tài chính cá nhân thông minh, bảo mật, hiện đại cho người Việt.",
  applicationName: "Nancy Finance",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: brandIcon,
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: brandIcon,
  },
  appleWebApp: {
    capable: true,
    title: "Nancy Finance",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
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
