import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ModuleRail } from "@/components/module-rail";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Richard G Studios",
  description: "Seu ambiente de trabalho com IA — NanoBanana Studio & PromptSave",
};

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-bg-root text-text-primary`}
      >
        <div className="flex h-screen overflow-hidden">
          <ModuleRail />
          <div className="flex-1 flex flex-col overflow-hidden">
            {children}
          </div>
          <ChatPanel />
        </div>
      </body>
    </html>
  );
}
