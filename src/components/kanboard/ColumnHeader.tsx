"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";

interface ColumnHeaderProps {
    column: { id: string; name: string; color: string | null; wipLimit: number };
    cardCount: number;
    onUpdate: (id: string, name: string) => void;
    onDelete: (id: string) => void;
}

export function ColumnHeader({ column, cardCount, onUpdate, onDelete }: ColumnHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(column.name);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const handleSave = () => {
        if (editName.trim() && editName !== column.name) {
            onUpdate(column.id, editName);
        }
        setIsEditing(false);
    };

    const isOverWip = column.wipLimit > 0 && cardCount > column.wipLimit;

    return (
        <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
                        className="w-full px-2 py-1 rounded-lg bg-bg-glass border border-border-default text-sm font-bold text-text-primary focus:outline-none kb-focus-accent"
                    />
                ) : (
                    <h3
                        className="font-display font-bold text-sm text-text-primary truncate cursor-pointer hover:text-amber-400 transition-colors"
                        onDoubleClick={() => { setIsEditing(true); setEditName(column.name); }}
                    >
                        {column.name}
                    </h3>
                )}
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border shrink-0 ${isOverWip
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-bg-glass border-border-default text-text-muted"
                    }`}>
                    {cardCount}{column.wipLimit > 0 ? `/${column.wipLimit}` : ""}
                </span>
            </div>

            <div className="relative shrink-0" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded-lg hover:bg-bg-glass-hover text-text-muted transition-colors"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-bg-surface border border-border-default shadow-xl z-50 py-1">
                        <button
                            onClick={() => { setIsEditing(true); setEditName(column.name); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                        >
                            <Pencil className="w-4 h-4" /> Renomear
                        </button>
                        <button
                            onClick={() => { onDelete(column.id); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4" /> Excluir coluna
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
