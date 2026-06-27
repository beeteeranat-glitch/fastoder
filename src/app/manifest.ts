import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FastOrder",
    short_name: "FastOrder",
    description: "สั่งเครื่องดื่มผ่าน QR",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f9ff",
    theme_color: "#0284c7",
    lang: "th",
    icons: [
      {
        src: "/window.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
