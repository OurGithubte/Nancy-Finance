import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nancy Finance",
    short_name: "Nancy Finance",
    description:
      "Nền tảng quản lý tài chính cá nhân thông minh, bảo mật, hiện đại cho người Việt.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#10b981",
    icons: [
      {
        src: "/branding/nancy-finance-master.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
