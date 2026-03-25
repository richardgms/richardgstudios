"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    DndContext,
    closestCorners,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCardOverlay, KbCardData } from "./KanbanCard";
import { NewColumnInline } from "./NewColumnInline";
import { CardDetailModal } from "./CardDetailModal";
import { BoardSettingsModal } from "./BoardSettingsModal";
import { Search, Filter, Settings, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

interface KbColumn {
    id: string;
    boardId: string;
    name: string;
    color: string | null;
    wipLimit: number;
    sortOrder: number;
}

interface KbLabel {
    id: string;
    boardId: string;
    name: string;
    color: string;
}

interface CardLabel {
    cardId: string;
    labelId: string;
}

interface BoardData {
    board: { id: string; name: string; description: string | null; color: string; isFavorite: boolean };
    columns: KbColumn[];
    cards: KbCardData[];
    labels: KbLabel[];
    cardLabels: CardLabel[];
}

export function KanbanBoard({ boardId }: { boardId: string }) {
    const [data, setData] = useState<BoardData | null>(null);
    const [columns, setColumns] = useState<KbColumn[]>([]);
    const [cards, setCards] = useState<KbCardData[]>([]);
    const [activeCardId, setActiveCardId] = useState<string | null>(null);
    const [selectedCard, setSelectedCard] = useState<KbCardData | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const { setKbActiveSection } = useAppStore();

    // Filters
    const [searchText, setSearchText] = useState("");
    const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
    const [filterLabels, setFilterLabels] = useState<string[]>([]);
    const [filterDue, setFilterDue] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const fetchBoard = useCallback(async () => {
        try {
            const res = await fetch(`/api/kanboard/boards/${boardId}`);
            const d = await res.json();
            if (d.board) {
                // Enrich cards with checklist/label data
                const enrichedCards: KbCardData[] = d.cards.map((c: KbCardData) => ({
                    ...c,
                    labelColors: d.cardLabels
                        .filter((cl: CardLabel) => cl.cardId === c.id)
                        .map((cl: CardLabel) => {
                            const label = d.labels.find((l: KbLabel) => l.id === cl.labelId);
                            return label?.color || "#888";
                        }),
                }));
                setData({ ...d, cards: enrichedCards });
                setColumns(d.columns);
                setCards(enrichedCards);
            }
        } catch { }
    }, [boardId]);

    useEffect(() => { fetchBoard(); }, [fetchBoard]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "Escape") {
                setSelectedCard(null);
                setShowSettings(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Filtered card IDs
    const filteredCardIds = useMemo(() => {
        if (!searchText && filterPriorities.length === 0 && filterLabels.length === 0 && !filterDue) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return new Set(
            cards.filter(c => {
                if (searchText) {
                    const q = searchText.toLowerCase();
                    if (!c.title.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) return false;
                }
                if (filterPriorities.length > 0 && !filterPriorities.includes(c.priority)) return false;
                if (filterLabels.length > 0) {
                    const cardLabelIds = data?.cardLabels.filter(cl => cl.cardId === c.id).map(cl => cl.labelId) || [];
                    if (!filterLabels.some(fl => cardLabelIds.includes(fl))) return false;
                }
                if (filterDue) {
                    const due = c.dueDate ? new Date(c.dueDate) : null;
                    if (due) due.setHours(0, 0, 0, 0);
                    switch (filterDue) {
                        case "overdue": if (!due || due >= now) return false; break;
                        case "today": if (!due || due.getTime() !== now.getTime()) return false; break;
                        case "week": {
                            const weekEnd = new Date(now);
                            weekEnd.setDate(weekEnd.getDate() + 7);
                            if (!due || due < now || due > weekEnd) return false;
                            break;
                        }
                        case "none": if (due) return false; break;
                    }
                }
                return true;
            }).map(c => c.id)
        );
    }, [cards, searchText, filterPriorities, filterLabels, filterDue, data?.cardLabels]);

    const getCardsForColumn = (columnId: string) =>
        cards.filter(c => c.columnId === columnId).sort((a, b) => a.sortOrder - b.sortOrder);

    const findColumnOfCard = (cardId: string): string | null => {
        return cards.find(c => c.id === cardId)?.columnId || null;
    };

    // DnD handlers
    const onDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === "card") {
            setActiveCardId(active.id as string);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType !== "card") return;

        const activeCardId = active.id as string;
        let overColumnId: string | null = null;

        if (overType === "column") {
            overColumnId = over.id as string;
        } else if (overType === "card") {
            overColumnId = cards.find(c => c.id === over.id)?.columnId || null;
        }

        if (!overColumnId) return;

        const activeColumn = findColumnOfCard(activeCardId);
        if (activeColumn === overColumnId) return;

        // Move card to new column in local state
        setCards(prev => prev.map(c =>
            c.id === activeCardId ? { ...c, columnId: overColumnId! } : c
        ));
    };

    const onDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCardId(null);

        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        // Column reorder
        if (activeType === "column" && overType === "column") {
            const oldIndex = columns.findIndex(c => c.id === active.id);
            const newIndex = columns.findIndex(c => c.id === over.id);
            if (oldIndex !== newIndex) {
                const newCols = arrayMove(columns, oldIndex, newIndex);
                setColumns(newCols);
                await fetch("/api/kanboard/reorder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "columns", orderedIds: newCols.map(c => c.id) }),
                });
            }
            return;
        }

        // Card reorder/move
        if (activeType === "card") {
            const activeCardId = active.id as string;
            let targetColumnId: string;

            if (overType === "column") {
                targetColumnId = over.id as string;
            } else if (overType === "card") {
                targetColumnId = cards.find(c => c.id === over.id)?.columnId || findColumnOfCard(activeCardId)!;
            } else {
                return;
            }

            const columnCards = cards
                .filter(c => c.columnId === targetColumnId)
                .sort((a, b) => a.sortOrder - b.sortOrder);

            const oldIndex = columnCards.findIndex(c => c.id === activeCardId);
            const overCardIndex = overType === "card"
                ? columnCards.findIndex(c => c.id === over.id)
                : columnCards.length;

            let newOrder: string[];
            if (oldIndex >= 0 && overCardIndex >= 0) {
                newOrder = arrayMove(columnCards, oldIndex, overCardIndex).map(c => c.id);
            } else {
                newOrder = columnCards.map(c => c.id);
                if (!newOrder.includes(activeCardId)) {
                    newOrder.splice(overCardIndex >= 0 ? overCardIndex : newOrder.length, 0, activeCardId);
                }
            }

            // Update local state
            setCards(prev => {
                const updated = [...prev];
                newOrder.forEach((id, idx) => {
                    const card = updated.find(c => c.id === id);
                    if (card) {
                        card.sortOrder = idx;
                        card.columnId = targetColumnId;
                    }
                });
                return updated;
            });

            await fetch("/api/kanboard/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "cards", columnId: targetColumnId, orderedIds: newOrder }),
            });
        }
    };

    const handleColumnUpdate = async (id: string, name: string) => {
        await fetch("/api/kanboard/columns", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, name }),
        });
        fetchBoard();
    };

    const handleColumnDelete = async (id: string) => {
        await fetch(`/api/kanboard/columns?id=${id}`, { method: "DELETE" });
        fetchBoard();
    };

    const activeCard = activeCardId ? cards.find(c => c.id === activeCardId) : null;
    const hasActiveFilters = searchText || filterPriorities.length > 0 || filterLabels.length > 0 || filterDue;

    if (!data) {
        return (
            <div className="flex items-center justify-center h-full text-text-muted">
                Carregando...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-surface/50 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/boards"
                        onClick={() => setKbActiveSection('ALL')}
                        className="p-2 -ml-2 rounded-lg text-text-muted hover:bg-bg-glass-hover hover:text-text-primary transition-all group"
                        title="Voltar para todos os quadros"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="font-display font-bold text-xl text-text-primary">{data.board.name}</h1>
                        {data.board.description && (
                            <p className="text-xs text-text-muted mt-0.5">{data.board.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Buscar cards..."
                            className="pl-8 pr-3 py-1.5 w-48 rounded-lg bg-bg-glass border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-colors ${hasActiveFilters ? "bg-amber-500/10 text-amber-400" : "text-text-muted hover:bg-bg-glass-hover"}`}
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 rounded-lg text-text-muted hover:bg-bg-glass-hover transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter toolbar */}
            {showFilters && (
                <div className="flex items-center gap-3 px-6 py-3 border-b border-border-default bg-bg-surface/30 flex-wrap">
                    {/* Priority filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted uppercase font-semibold">Prioridade:</span>
                        {["low", "medium", "high", "urgent"].map(p => (
                            <button
                                key={p}
                                onClick={() => setFilterPriorities(prev =>
                                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                                )}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${filterPriorities.includes(p)
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                    : "border-border-default text-text-muted hover:text-text-secondary"
                                    }`}
                            >
                                {p === "low" ? "Baixa" : p === "medium" ? "Média" : p === "high" ? "Alta" : "Urgente"}
                            </button>
                        ))}
                    </div>

                    {/* Due date filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted uppercase font-semibold">Prazo:</span>
                        {[
                            { id: "overdue", label: "Atrasado" },
                            { id: "today", label: "Hoje" },
                            { id: "week", label: "Esta semana" },
                            { id: "none", label: "Sem prazo" },
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => setFilterDue(prev => prev === d.id ? "" : d.id)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${filterDue === d.id
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                    : "border-border-default text-text-muted hover:text-text-secondary"
                                    }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>

                    {/* Label filter */}
                    {data.labels.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-text-muted uppercase font-semibold">Labels:</span>
                            {data.labels.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setFilterLabels(prev =>
                                        prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id]
                                    )}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${filterLabels.includes(l.id)
                                        ? "border-amber-500/30"
                                        : "border-border-default"
                                        }`}
                                    style={{ backgroundColor: filterLabels.includes(l.id) ? l.color + "33" : undefined, color: l.color }}
                                >
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearchText(""); setFilterPriorities([]); setFilterLabels([]); setFilterDue(""); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-red-400 hover:bg-red-500/10 border border-red-500/20"
                        >
                            <X className="w-3 h-3" /> Limpar
                        </button>
                    )}
                </div>
            )}

            {/* Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex gap-4 h-full items-start">
                        <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                            {columns.map((col) => (
                                <KanbanColumn
                                    key={col.id}
                                    column={col}
                                    cards={getCardsForColumn(col.id)}
                                    boardId={boardId}
                                    onCardClick={setSelectedCard}
                                    onColumnUpdate={handleColumnUpdate}
                                    onColumnDelete={handleColumnDelete}
                                    onRefresh={fetchBoard}
                                    filteredCardIds={filteredCardIds || undefined}
                                />
                            ))}
                        </SortableContext>
                        <NewColumnInline boardId={boardId} onCreated={fetchBoard} />
                    </div>

                    <DragOverlay>
                        {activeCard ? <KanbanCardOverlay card={activeCard} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Card Detail Modal */}
            {selectedCard && (
                <CardDetailModal
                    cardId={selectedCard.id}
                    boardId={boardId}
                    columns={columns}
                    labels={data.labels}
                    onClose={() => setSelectedCard(null)}
                    onRefresh={fetchBoard}
                />
            )}

            {/* Board Settings Modal */}
            {showSettings && data.board && (
                <BoardSettingsModal
                    board={data.board}
                    labels={data.labels}
                    onClose={() => setShowSettings(false)}
                    onRefresh={fetchBoard}
                />
            )}
        </div>
    );
}
