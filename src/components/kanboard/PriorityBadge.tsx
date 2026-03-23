"use client";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; pulse?: boolean }> = {
    none: { label: "", color: "" },
    low: { label: "Baixa", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    medium: { label: "Média", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    high: { label: "Alta", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    urgent: { label: "Urgente", color: "bg-red-500/20 text-red-400 border-red-500/30", pulse: true },
};

export function PriorityBadge({ priority }: { priority: string }) {
    const config = PRIORITY_CONFIG[priority];
    if (!config || !config.label) return null;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${config.color} ${config.pulse ? "animate-pulse" : ""}`}>
            {config.label}
        </span>
    );
}
