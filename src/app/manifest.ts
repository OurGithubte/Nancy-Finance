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
      // Next.js's MetadataRoute.Manifest type only accepts a single `purpose` literal
      // ("any" | "maskable" | "monochrome"), not the space-separated multi-value string
      // the raw Web App Manifest spec allows. Two entries for the same icon convey both
      // purposes correctly under that narrower type instead of failing typecheck.
      {
        src: "/branding/nancy-finance-master.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/branding/nancy-finance-master.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
