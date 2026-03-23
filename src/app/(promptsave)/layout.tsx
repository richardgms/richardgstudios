import { PsSidebar } from "@/components/promptsave/ps-sidebar";

export default function PromptSaveLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="promptsave-theme flex flex-1 h-full overflow-hidden">
            <PsSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
