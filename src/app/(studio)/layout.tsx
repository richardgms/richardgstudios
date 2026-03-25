import { Sidebar } from "@/components/sidebar";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { MobileDrawer } from "@/components/MobileDrawer";

const STUDIO_TITLE_MAP: Record<string, string> = {
    "/browse":     "Explorar",
    "/brainstorm": "Brainstorm",
    "/studio":     "Studio AI",
    "/projects":   "Projetos",
    "/gallery":    "Galeria",
    "/favorites":  "Favoritos",
    "/history":    "Histórico",
    "/trash":      "Lixeira",
};

export default function StudioLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-1 h-full overflow-hidden">
            <Sidebar />
            {/* Wrapper flex-col: empilha MobilePageHeader (mobile) + main */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <MobilePageHeader titleMap={STUDIO_TITLE_MAP} />
                <MobileDrawer module="studio" />
                <main className="flex-1 overflow-y-auto pb-mobile-nav">
                    {children}
                </main>
            </div>
        </div>
    );
}
