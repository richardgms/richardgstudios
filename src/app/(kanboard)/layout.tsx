import { KbSidebar } from "@/components/kanboard/kb-sidebar";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { MobileDrawer } from "@/components/MobileDrawer";

export default function KanBoardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="kanboard-theme flex flex-1 h-full overflow-hidden">
            <KbSidebar />
            {/* Wrapper flex-col: empilha MobilePageHeader (mobile) + main */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <MobilePageHeader title="KanBoard" />
                <MobileDrawer module="kanboard" />
                <main className="flex-1 overflow-y-auto pb-mobile-nav">
                    {children}
                </main>
            </div>
        </div>
    );
}
