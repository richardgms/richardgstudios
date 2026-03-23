"use client";

import { Check } from "lucide-react";

interface Label {
    id: string;
    name: string;
    color: string;
}

export function LabelPicker({ labels, activeIds, onToggle }: {
    labels: Label[];
    activeIds: string[];
    onToggle: (labelId: string) => void;
}) {
    if (labels.length === 0) {
        return <p className="text-xs text-text-muted">Nenhuma label criada ainda.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
                const isActive = activeIds.includes(label.id);
                return (
                    <button
                        key={label.id}
                        onClick={() => onToggle(label.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                        style={{
                            backgroundColor: isActive ? label.color + "33" : "transparent",
                            borderColor: isActive ? label.color + "66" : "var(--color-border-default)",
                            color: label.color,
                        }}
                    >
                        {isActive && <Check className="w-3 h-3" />}
                        {label.name}
                    </button>
                );
            })}
        </div>
    );
}
