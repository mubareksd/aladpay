import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AladPay Bank QR",
    short_name: "AladPay",
    description: "Create static payment QR codes for Ethiopian banks.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#146356",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
