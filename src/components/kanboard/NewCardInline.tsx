"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function NewCardInline({ columnId, boardId, onCreated }: {
    columnId: string;
    boardId: string;
    onCreated: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");

    const handleSubmit = async () => {
        if (!title.trim()) return;
        await fetch("/api/kanboard/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ columnId, boardId, title }),
        });
        setTitle("");
        setIsOpen(false);
        onCreated();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-all"
            >
                <Plus className="w-4 h-4" /> Adicionar card
            </button>
        );
    }

    return (
        <div className="p-2">
            <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do card..."
                rows={2}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent resize-none"
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                    if (e.key === "Escape") { setIsOpen(false); setTitle(""); }
                }}
            />
            <div className="flex gap-2 mt-2">
                <button onClick={handleSubmit} disabled={!title.trim()} className="px-3 py-1.5 rounded-lg kb-accent-gradient text-xs font-medium disabled:opacity-40">
                    Adicionar
                </button>
                <button onClick={() => { setIsOpen(false); setTitle(""); }} className="p-1.5 rounded-lg hover:bg-bg-glass-hover text-text-muted">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
