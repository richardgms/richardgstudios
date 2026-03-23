"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function NewColumnInline({ boardId, onCreated }: {
    boardId: string;
    onCreated: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");

    const handleSubmit = async () => {
        if (!name.trim()) return;
        await fetch("/api/kanboard/columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId, name }),
        });
        setName("");
        setIsOpen(false);
        onCreated();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-[320px] shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border-default text-sm text-text-muted hover:text-text-primary hover:border-amber-500/30 hover:bg-amber-500/5 transition-all h-fit"
            >
                <Plus className="w-4 h-4" /> Adicionar coluna
            </button>
        );
    }

    return (
        <div className="w-[320px] shrink-0 p-3 rounded-xl border border-border-default bg-bg-glass">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da coluna..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                    if (e.key === "Escape") { setIsOpen(false); setName(""); }
                }}
            />
            <div className="flex gap-2 mt-2">
                <button onClick={handleSubmit} disabled={!name.trim()} className="px-3 py-1.5 rounded-lg kb-accent-gradient text-xs font-medium disabled:opacity-40">
                    Adicionar
                </button>
                <button onClick={() => { setIsOpen(false); setName(""); }} className="p-1.5 rounded-lg hover:bg-bg-glass-hover text-text-muted">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
