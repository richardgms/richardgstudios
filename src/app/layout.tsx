import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ModuleRail } from "@/components/module-rail";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "Richard G Studios",
  description: "Seu ambiente de trabalho com IA — NanoBanana Studio & PromptSave",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RG Studios",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

import { BottomNavigation } from "@/components/bottom-navigation";
import { MotionProvider } from "@/components/motion-provider";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased bg-bg-root text-text-primary">
        <MotionProvider>
          <ServiceWorkerRegistrar />
          <div className="flex h-dvh overflow-hidden">
            <ModuleRail />
            <div className="flex-1 flex flex-col overflow-hidden">
              {children}
            </div>
            <BottomNavigation />
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
