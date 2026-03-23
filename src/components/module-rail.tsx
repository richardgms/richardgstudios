"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Banana, BookmarkCheck, Columns3, Settings } from "lucide-react";

const STUDIO_ROUTES = ['/browse', '/brainstorm', '/studio', '/projects', '/favorites', '/history', '/trash'];
const PROMPTSAVE_ROUTES = ['/vault'];
const KANBOARD_ROUTES = ['/boards', '/board'];

function getActiveModule(pathname: string): 'hub' | 'studio' | 'promptsave' | 'kanboard' {
    if (STUDIO_ROUTES.some(r => pathname.startsWith(r))) return 'studio';
    if (PROMPTSAVE_ROUTES.some(r => pathname.startsWith(r))) return 'promptsave';
    if (KANBOARD_ROUTES.some(r => pathname.startsWith(r))) return 'kanboard';
    return 'hub';
}

const modules = [
    { id: 'hub' as const, href: '/', icon: LayoutGrid, label: 'Hub', position: 'top' as const },
    { id: 'studio' as const, href: '/browse', icon: Banana, label: 'NanoBanana Studio', position: 'middle' as const },
    { id: 'promptsave' as const, href: '/vault', icon: BookmarkCheck, label: 'PromptSave', position: 'middle' as const },
    { id: 'kanboard' as const, href: '/boards', icon: Columns3, label: 'KanBoard', position: 'middle' as const },
];

export function ModuleRail() {
    const pathname = usePathname();
    const activeModule = getActiveModule(pathname);

    return (
        <aside className="w-[52px] h-screen flex flex-col items-center py-4 border-r border-border-default bg-[#0e0e10] shrink-0 z-40">
            {/* Top: Hub */}
            <div className="flex flex-col items-center gap-1 mb-6">
                {modules.filter(m => m.position === 'top').map(mod => {
                    const isActive = activeModule === mod.id;
                    const Icon = mod.icon;
                    return (
                        <Link
                            key={mod.id}
                            href={mod.href}
                            title={mod.label}
                            className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-accent/15 text-accent-light'
                                : 'text-text-muted hover:text-text-primary hover:bg-bg-glass-hover'
                                }`}
                        >
                            {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                            )}
                            <Icon className="w-5 h-5" />
                        </Link>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="w-6 h-px bg-border-default mb-4" />

            {/* Middle: Modules */}
            <div className="flex flex-col items-center gap-1 flex-1">
                {modules.filter(m => m.position === 'middle').map(mod => {
                    const isActive = activeModule === mod.id;
                    const Icon = mod.icon;
                    return (
                        <Link
                            key={mod.id}
                            href={mod.href}
                            title={mod.label}
                            className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-accent/15 text-accent-light'
                                : 'text-text-muted hover:text-text-primary hover:bg-bg-glass-hover'
                                }`}
                        >
                            {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                            )}
                            <Icon className="w-5 h-5" />
                        </Link>
                    );
                })}
            </div>

            {/* Bottom: Settings (future) */}
            <div className="flex flex-col items-center gap-1 mt-auto">
                <button
                    title="Configurações (em breve)"
                    disabled
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-text-muted/40 cursor-not-allowed"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </aside>
    );
}
