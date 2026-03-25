import { PsSidebar } from "@/components/promptsave/ps-sidebar";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { MobileDrawer } from "@/components/MobileDrawer";

export default function PromptSaveLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="promptsave-theme flex flex-1 h-full overflow-hidden">
            <PsSidebar />
            {/* Wrapper flex-col: empilha MobilePageHeader (mobile) + main */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <MobilePageHeader title="Vault" />
                <MobileDrawer module="promptsave" />
                <main className="flex-1 overflow-y-auto pb-mobile-nav">
                    {children}
                </main>
            </div>
        </div>
    );
}
