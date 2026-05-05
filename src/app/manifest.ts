import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const token = process.env.SECRET_TOKEN || "";
  return {
    name: "Strawberry",
    short_name: "Strawberry",
    description: "Your private learning feed",
    start_url: `/feed/${token}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e11d48",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
