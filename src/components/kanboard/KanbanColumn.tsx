"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanCard, KbCardData } from "./KanbanCard";
import { ColumnHeader } from "./ColumnHeader";
import { NewCardInline } from "./NewCardInline";

interface KbColumn {
    id: string;
    boardId: string;
    name: string;
    color: string | null;
    wipLimit: number;
    sortOrder: number;
}

interface KanbanColumnProps {
    column: KbColumn;
    cards: KbCardData[];
    boardId: string;
    onCardClick: (card: KbCardData) => void;
    onColumnUpdate: (id: string, name: string) => void;
    onColumnDelete: (id: string) => void;
    onRefresh: () => void;
    filteredCardIds?: Set<string>;
}

export function KanbanColumn({
    column, cards, boardId, onCardClick, onColumnUpdate, onColumnDelete, onRefresh, filteredCardIds,
}: KanbanColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: { type: "column", column },
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: column.id,
        data: { type: "column", column },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const cardIds = cards.map(c => c.id);

    return (
        <div
            ref={(node) => {
                setSortableRef(node);
                setDroppableRef(node);
            }}
            style={style}
            className="w-[320px] shrink-0 flex flex-col rounded-2xl bg-bg-glass/50 border border-border-default max-h-full"
        >
            <div {...attributes} {...listeners} className="cursor-grab">
                <ColumnHeader
                    column={column}
                    cardCount={cards.length}
                    onUpdate={onColumnUpdate}
                    onDelete={onColumnDelete}
                />
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px]">
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {cards.map((card) => (
                        <KanbanCard
                            key={card.id}
                            card={card}
                            onClick={onCardClick}
                            filterOpacity={filteredCardIds ? !filteredCardIds.has(card.id) : false}
                        />
                    ))}
                </SortableContext>
            </div>

            <div className="px-2 pb-2">
                <NewCardInline columnId={column.id} boardId={boardId} onCreated={onRefresh} />
            </div>
        </div>
    );
}
