"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PriorityBadge } from "./PriorityBadge";
import { DueDateBadge } from "./DueDateBadge";
import { ChecklistProgress } from "./ChecklistProgress";
import { GripVertical } from "lucide-react";

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

export interface KbCardData {
    id: string;
    columnId: string;
    boardId: string;
    title: string;
    description: string | null;
    color: string | null;
    priority: string;
    dueDate: string | null;
    isCompleted: boolean;
    sortOrder: number;
    checklistTotal?: number;
    checklistChecked?: number;
    labelColors?: string[];
}

interface KanbanCardProps {
    card: KbCardData;
    onClick: (card: KbCardData) => void;
    filterOpacity?: boolean;
}

export function KanbanCard({ card, onClick, filterOpacity }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: card.id,
        data: { type: "card", card },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : filterOpacity ? 0.2 : 1,
    };

    const colorHex = card.color ? COLOR_MAP[card.color] : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group glass-card p-3 cursor-pointer hover:border-amber-500/30 transition-all ${card.isCompleted ? "opacity-60" : ""}`}
            onClick={() => onClick(card)}
        >
            {/* Color bar */}
            {colorHex && (
                <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: colorHex }} />
            )}

            {/* Labels */}
            {card.labelColors && card.labelColors.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                    {card.labelColors.map((c, i) => (
                        <span key={i} className="w-8 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                </div>
            )}

            <div className="flex items-start gap-1.5">
                <span
                    {...attributes}
                    {...listeners}
                    className="mt-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-text-muted hover:text-text-primary"
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </span>
                <p className={`text-sm text-text-primary flex-1 ${card.isCompleted ? "line-through" : ""}`}>
                    {card.title}
                </p>
            </div>

            {/* Metadata row */}
            {(card.priority !== "none" || card.dueDate || (card.checklistTotal && card.checklistTotal > 0)) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <PriorityBadge priority={card.priority} />
                    <DueDateBadge dueDate={card.dueDate} isCompleted={card.isCompleted} />
                    {card.checklistTotal !== undefined && card.checklistTotal > 0 && (
                        <div className="flex-1 min-w-[80px]">
                            <ChecklistProgress total={card.checklistTotal} checked={card.checklistChecked || 0} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Ghost card for DragOverlay
export function KanbanCardOverlay({ card }: { card: KbCardData }) {
    const colorHex = card.color ? COLOR_MAP[card.color] : null;

    return (
        <div className="glass-card p-3 w-[288px] shadow-2xl border-amber-500/30 rotate-2">
            {colorHex && (
                <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: colorHex }} />
            )}
            <p className="text-sm text-text-primary">{card.title}</p>
        </div>
    );
}
