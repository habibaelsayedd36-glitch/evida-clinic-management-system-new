import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Evida Clinic",
    short_name: "Evida",
    description: "Evida Clinic Management System",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fcfbff",
    theme_color: "#6c4ad4",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
