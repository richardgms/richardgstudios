"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Search,
    Brain,
    Palette,
    FolderOpen,
    Star,
    Banana,
    Trash2,
    ImageIcon,
    Sparkles,
} from "lucide-react";
import { useChatStore } from "@/store/chatStore";

const mainNavItems = [
    { href: "/browse", label: "Explorar Prompts", icon: Search },
    { href: "/brainstorm", label: "Brainstorm", icon: Brain },
    { href: "/studio", label: "Studio", icon: Palette },
    { href: "/projects", label: "Projetos", icon: FolderOpen },
];

const utilityItems = [
    { href: "/gallery", label: "Galeria", icon: ImageIcon },
    { href: "/favorites", label: "Favoritos", icon: Star },
    { href: "/trash", label: "Lixeira", icon: Trash2 },
];

export function Sidebar() {
    const pathname = usePathname();
    const toggleChat = useChatStore((state) => state.toggleChat);
    const [stats, setStats] = useState({ today: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };

        // Fetch immediately and potentially poll or refresh on navigation if needed
        fetchStats();

        // Simple polling every minute to keep it roughly updated
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className="w-60 h-screen flex flex-col border-r border-border-default bg-bg-surface shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                    <Banana className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-base text-text-primary leading-tight">
                        NanoBanana
                    </h1>
                    <p className="text-[11px] text-text-muted font-mono">Studio</p>
                </div>
            </div>

            {/* Navegação Principal */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                <div className="mb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Menu
                </div>
                {mainNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-accent/15 text-accent-light border border-accent/20"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                                }`}
                        >
                            <Icon className="w-[18px] h-[18px]" />
                            {item.label}
                        </Link>
                    );
                })}

                <div className="mt-8 mb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Biblioteca
                </div>
                {utilityItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-accent/15 text-accent-light border border-accent/20"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                                }`}
                        >
                            <Icon className="w-[18px] h-[18px]" />
                            {item.label}
                        </Link>
                    );
                })}
                <div className="mt-8 mb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Assistente
                </div>
                <button
                    onClick={toggleChat}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                >
                    <Sparkles className="w-[18px] h-[18px] text-accent" />
                    Nano AI Chat
                </button>
            </nav>

            {/* Footer Stats */}
            <div className="px-4 py-4 border-t border-border-default bg-bg-surface/50">
                <div className="glass-card p-3 text-center">
                    <p className="text-xs text-text-muted">Gerações hoje</p>
                    <p className="font-display font-bold text-lg text-text-primary">{stats.today}</p>
                </div>
            </div>
        </aside>
    );
}
