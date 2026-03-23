"use client";

import { Star, Trash2, RotateCcw, MoreHorizontal, Columns3, Pencil } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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

interface BoardCardProps {
    board: {
        id: string;
        name: string;
        description: string | null;
        color: string;
        isFavorite: boolean;
        isDeleted: boolean;
        columnCount: number;
        cardCount: number;
    };
    onToggleFavorite: (id: string) => void;
    onSoftDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onHardDelete: (id: string) => void;
    onEdit: (id: string) => void;
}

export function BoardCard({ board, onToggleFavorite, onSoftDelete, onRestore, onHardDelete, onEdit }: BoardCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const dotColor = COLOR_MAP[board.color] || "#f59e0b";

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="glass-card p-5 relative group">
            {/* Color bar */}
            <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ backgroundColor: dotColor }}
            />

            <div className="flex items-start justify-between mb-3 mt-1">
                <Link href={`/board/${board.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <h3 className="font-display font-bold text-base text-text-primary truncate hover:text-amber-400 transition-colors">
                            {board.name}
                        </h3>
                    </div>
                </Link>

                <div className="flex items-center gap-1 shrink-0">
                    {!board.isDeleted && (
                        <button
                            onClick={() => onToggleFavorite(board.id)}
                            className="p-1.5 rounded-lg hover:bg-bg-glass-hover transition-colors"
                        >
                            <Star className={`w-4 h-4 ${board.isFavorite ? "fill-amber-400 text-amber-400" : "text-text-muted"}`} />
                        </button>
                    )}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1.5 rounded-lg hover:bg-bg-glass-hover transition-colors text-text-muted"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-bg-surface border border-border-default shadow-xl z-50 py-1">
                                {board.isDeleted ? (
                                    <>
                                        <button onClick={() => { onRestore(board.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover">
                                            <RotateCcw className="w-4 h-4" /> Restaurar
                                        </button>
                                        <button onClick={() => { onHardDelete(board.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="w-4 h-4" /> Excluir permanente
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { onEdit(board.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover">
                                            <Pencil className="w-4 h-4" /> Editar
                                        </button>
                                        <button onClick={() => { onSoftDelete(board.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="w-4 h-4" /> Mover para lixeira
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {board.description && (
                <p className="text-xs text-text-muted mb-3 line-clamp-2">{board.description}</p>
            )}

            <div className="flex gap-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Columns3 className="w-3.5 h-3.5" />
                    {board.columnCount} colunas
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold">#</span>
                    {board.cardCount} cards
                </div>
            </div>
        </div>
    );
}
