"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Banana, BookmarkCheck, Columns3 } from "lucide-react";

/* Espelha a mesma lógica de detecção de módulo do ModuleRail */
const STUDIO_ROUTES = ["/browse", "/brainstorm", "/studio", "/projects", "/favorites", "/gallery", "/history", "/trash"];
const PROMPTSAVE_ROUTES = ["/vault"];
const KANBOARD_ROUTES = ["/boards", "/board"];

function getActiveModule(pathname: string): "hub" | "studio" | "promptsave" | "kanboard" {
    if (STUDIO_ROUTES.some((r) => pathname.startsWith(r))) return "studio";
    if (PROMPTSAVE_ROUTES.some((r) => pathname.startsWith(r))) return "promptsave";
    if (KANBOARD_ROUTES.some((r) => pathname.startsWith(r))) return "kanboard";
    return "hub";
}

const tabs = [
    { id: "hub" as const,       href: "/",       icon: LayoutGrid,    label: "Hub"    },
    { id: "studio" as const,    href: "/browse",  icon: Banana,        label: "Studio" },
    { id: "promptsave" as const,href: "/vault",   icon: BookmarkCheck, label: "Vault"  },
    { id: "kanboard" as const,  href: "/boards",  icon: Columns3,      label: "Boards" },
];

export function BottomNavigation() {
    const pathname = usePathname();
    const activeModule = getActiveModule(pathname);

    return (
        <nav
            /* z-[55]: acima do ChatPanel (z-50), abaixo dos dropdowns de conteúdo (z-[60])
               will-change + translateZ: promove para layer GPU, previne iOS rubber-band jitter */
            className="fixed bottom-0 left-0 right-0 z-[55] flex md:hidden h-16 border-t border-border-default bg-[#0e0e10]/95 backdrop-blur-xl"
            style={{
                paddingBottom: "var(--safe-area-bottom)",
                willChange: "transform",
                transform: "translateZ(0)",
            }}
        >
            {tabs.map((tab) => {
                const isActive = activeModule === tab.id;
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.id}
                        href={tab.href}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                            isActive ? "text-accent-light" : "text-text-muted"
                        }`}
                    >
                        <div
                            className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
                                isActive ? "bg-accent/15" : ""
                            }`}
                        >
                            <Icon className="w-[18px] h-[18px]" />
                            {/* Indicador de ativo — dot no topo do ícone */}
                            {isActive && (
                                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-accent" />
                            )}
                        </div>
                        <span
                            className={`text-[10px] font-medium tracking-wide leading-none ${
                                isActive ? "text-accent-light" : "text-text-muted"
                            }`}
                        >
                            {tab.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
