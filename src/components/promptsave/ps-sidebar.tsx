"use client";

import { BookmarkCheck, Star, Trash2, Tag } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function PsSidebar() {
    const { psPromptCount, psActiveSection, setPsActiveSection } = useAppStore();

    const navItems = [
        { id: "ALL", label: "Todos", icon: BookmarkCheck },
        { id: "FAVORITES", label: "Favoritos", icon: Star },
        { id: "CATEGORIES", label: "Categorias", icon: Tag },
        { id: "TRASH", label: "Lixeira", icon: Trash2 },
    ] as const;

    return (
        <aside className="hidden md:flex w-60 h-screen flex-col border-r border-border-default bg-bg-surface shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <BookmarkCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-base text-text-primary leading-tight">
                        PromptSave
                    </h1>
                    <p className="text-[11px] text-text-muted font-mono">Vault</p>
                </div>
            </div>

            {/* Navegação Principal */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                <div className="mb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Navegação
                </div>
                {navItems.map((item) => {
                    const isActive = psActiveSection === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setPsActiveSection(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                                }`}
                        >
                            <Icon className="w-[18px] h-[18px]" />
                            {item.label}
                            {item.id === "ALL" && (
                                <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${isActive
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-bg-glass border-border-default text-text-muted group-hover:text-text-secondary"
                                    }`}>
                                    {psPromptCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer Stats */}
            <div className="px-4 py-4 border-t border-border-default bg-bg-surface/50">
                <div className="glass-card p-3 text-center">
                    <p className="text-xs text-text-muted">Total de Prompts</p>
                    <p className="font-display font-bold text-lg text-text-primary">{psPromptCount}</p>
                </div>
            </div>
        </aside>
    );
}
