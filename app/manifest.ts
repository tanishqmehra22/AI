import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/constants";

// Makes StudyOS installable as a standalone app. `start_url` opens the
// workspace rather than the marketing page, since anyone who installed it
// has already signed up.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — AI study workspace`,
    short_name: APP_NAME,
    description: "Organize coursework and ask grounded questions about your own study material.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8f5",
    theme_color: "#059669",
    orientation: "portrait-primary",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "AI Assistant", url: "/assistant" },
      { name: "Documents", url: "/documents" },
      { name: "Assignments", url: "/assignments" },
    ],
  };
}
