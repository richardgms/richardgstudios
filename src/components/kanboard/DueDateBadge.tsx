"use client";

import { Calendar } from "lucide-react";

export function DueDateBadge({ dueDate, isCompleted }: { dueDate: string | null; isCompleted?: boolean }) {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let colorClass: string;
    let label: string;

    if (isCompleted) {
        colorClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        label = due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } else if (diffDays < 0) {
        colorClass = "bg-red-500/20 text-red-400 border-red-500/30";
        label = "Atrasado";
    } else if (diffDays === 0) {
        colorClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
        label = "Hoje";
    } else if (diffDays <= 7) {
        colorClass = "bg-blue-500/20 text-blue-400 border-blue-500/30";
        label = due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } else {
        colorClass = "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
        label = due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    }

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${colorClass}`}>
            <Calendar className="w-3 h-3" />
            {label}
        </span>
    );
}
