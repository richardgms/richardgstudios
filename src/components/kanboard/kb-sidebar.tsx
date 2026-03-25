"use client";

import { Columns3, Star, Trash2, LayoutGrid } from "lucide-react";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BoardSummary {
    id: string;
    name: string;
    color: string;
}

const COLOR_MAP: Record<string, string> = {
    "bg-red-500": "#ef4444",
    "bg-orange-500": "#f97316",
    "bg-amber-500": "#f59e0b",
    "bg-emerald-500": "#10b981",
    "bg-teal-500": "#14b8a6",
    "bg-cyan-500": "#06b6d4",
    "bg-blue-500": "#3b82f6",
    "bg-indigo-500": "#6366f1",
    "bg-purple-500": "#a855f7",
    "bg-pink-500": "#ec4899",
    "bg-gray-500": "#6b7280",
};

export function KbSidebar() {
    const { kbBoardCount, kbActiveSection, setKbActiveSection, kbActiveBoardId } = useAppStore();
    const pathname = usePathname();
    const [boards, setBoards] = useState<BoardSummary[]>([]);

    useEffect(() => {
        fetch("/api/kanboard/boards")
            .then(r => r.json())
            .then(data => {
                if (data.boards) {
                    setBoards(
                        data.boards
                            .filter((b: BoardSummary & { isDeleted?: boolean }) => !b.isDeleted)
                            .slice(0, 20)
                            .map((b: BoardSummary) => ({ id: b.id, name: b.name, color: b.color }))
                    );
                }
            })
            .catch(() => { });
    }, [kbBoardCount]);

    const navItems = [
        { id: "ALL", label: "Todos", icon: LayoutGrid },
        { id: "FAVORITES", label: "Favoritos", icon: Star },
        { id: "TRASH", label: "Lixeira", icon: Trash2 },
    ] as const;

    return (
        <aside className="hidden md:flex w-60 h-screen flex-col border-r border-border-default bg-bg-surface shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Columns3 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-base text-text-primary leading-tight">
                        KanBoard
                    </h1>
                    <p className="text-[11px] text-text-muted font-mono">Boards</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="px-3 space-y-1">
                <div className="mb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Navegação
                </div>
                {navItems.map((item) => {
                    const isActive = kbActiveSection === item.id && pathname === "/boards";
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.id}
                            href="/boards"
                            onClick={() => setKbActiveSection(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                                }`}
                        >
                            <Icon className="w-[18px] h-[18px]" />
                            {item.label}
                            {item.id === "ALL" && (
                                <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${isActive
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    : "bg-bg-glass border-border-default text-text-muted"
                                    }`}>
                                    {kbBoardCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Board List */}
            {boards.length > 0 && (
                <div className="mt-4 px-3 flex-1 overflow-y-auto">
                    <div className="mb-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Quadros
                    </div>
                    <div className="space-y-0.5">
                        {boards.map((board) => {
                            const isActive = kbActiveBoardId === board.id || pathname === `/board/${board.id}`;
                            const dotColor = COLOR_MAP[board.color] || "#f59e0b";
                            return (
                                <Link
                                    key={board.id}
                                    href={`/board/${board.id}`}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                                        }`}
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: dotColor }}
                                    />
                                    <span className="truncate">{board.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer Stats */}
            <div className="px-4 py-4 border-t border-border-default bg-bg-surface/50 mt-auto">
                <div className="glass-card p-3 text-center">
                    <p className="text-xs text-text-muted">Total de Quadros</p>
                    <p className="font-display font-bold text-lg text-text-primary">{kbBoardCount}</p>
                </div>
            </div>
        </aside>
    );
}
