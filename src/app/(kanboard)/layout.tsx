import { KbSidebar } from "@/components/kanboard/kb-sidebar";

export default function KanBoardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="kanboard-theme flex flex-1 h-full overflow-hidden">
            <KbSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
