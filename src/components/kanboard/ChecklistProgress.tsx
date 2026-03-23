"use client";

import { CheckSquare } from "lucide-react";

export function ChecklistProgress({ total, checked }: { total: number; checked: number }) {
    if (total === 0) return null;
    const pct = Math.round((checked / total) * 100);
    const isComplete = checked === total;

    return (
        <div className="flex items-center gap-2">
            <CheckSquare className={`w-3.5 h-3.5 ${isComplete ? "text-emerald-400" : "text-text-muted"}`} />
            <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${isComplete ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`text-[10px] font-mono ${isComplete ? "text-emerald-400" : "text-text-muted"}`}>
                {checked}/{total}
            </span>
        </div>
    );
}
