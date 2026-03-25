import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Richard G Studios",
    short_name: "RG Studios",
    description: "Seu ambiente de trabalho com IA — NanoBanana Studio & PromptSave",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
