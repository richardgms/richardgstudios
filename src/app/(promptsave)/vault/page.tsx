"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Star,
    Trash2,
    Copy,
    MoreHorizontal,
    Pencil,
    RotateCcw,
    X,
    Sparkles,
    Loader2,
    GripVertical,
    Tag,
    Filter,
    ChevronDown,
    BookmarkCheck,
    ArrowLeft,
    FolderSync,
    Check,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePromptCategoryStore } from "@/store/promptCategoryStore";
import { PromptCategoryModal } from "@/components/promptsave/PromptCategoryModal";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──
interface PsCategory { id: string; name: string; createdAt: number; }
interface PsPrompt {
    id: string; title: string; content: string; folderId: string | null;
    color: string; createdAt: number; tags?: string[];
    isFavorite?: boolean; isDeleted?: boolean;
}
type ColorOption = { id: string; value: string; label: string; hex: string; };

// ── Constants ──
const COLORS: ColorOption[] = [
    { id: "red", value: "bg-red-500", label: "Vermelho", hex: "#ef4444" },
    { id: "orange", value: "bg-orange-500", label: "Laranja", hex: "#f97316" },
    { id: "amber", value: "bg-amber-500", label: "Âmbar", hex: "#f59e0b" },
    { id: "green", value: "bg-emerald-500", label: "Verde", hex: "#10b981" },
    { id: "teal", value: "bg-teal-500", label: "Verde-azulado", hex: "#14b8a6" },
    { id: "cyan", value: "bg-cyan-500", label: "Ciano", hex: "#06b6d4" },
    { id: "blue", value: "bg-blue-500", label: "Azul", hex: "#3b82f6" },
    { id: "indigo", value: "bg-indigo-500", label: "Índigo", hex: "#6366f1" },
    { id: "purple", value: "bg-purple-500", label: "Roxo", hex: "#a855f7" },
    { id: "pink", value: "bg-pink-500", label: "Rosa", hex: "#ec4899" },
    { id: "gray", value: "bg-gray-500", label: "Cinza", hex: "#6b7280" },
];

// ── SortablePromptCard ──
function SortablePromptCard({
    prompt, categories, onEdit, onDelete, onRestore, onPermanentlyDelete,
    onToggleFavorite, onCopy, onClick,
}: {
    prompt: PsPrompt; categories: PsCategory[];
    onEdit: (p: PsPrompt) => void; onDelete: (id: string) => void;
    onRestore: (id: string) => void; onPermanentlyDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void; onCopy: (text: string) => void;
    onClick: (p: PsPrompt) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: prompt.id });
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const categoryName = prompt.folderId ? categories.find((c) => c.id === prompt.folderId)?.name : null;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto" as const,
    };

    const [longPressTriggered, setLongPressTriggered] = useState(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        setLongPressTriggered(false);

        longPressTimeoutRef.current = setTimeout(() => {
            setLongPressTriggered(true);
            onCopy(prompt.content);
            if (window.navigator?.vibrate) {
                window.navigator.vibrate(50);
            }
        }, 600);
    };

    const handlePointerUpOrLeave = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const handleCardClick = () => {
        if (isDragging) return;
        if (longPressTriggered) return;
        onClick(prompt);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}
            className="group relative glass-card p-5 flex flex-col h-[200px] cursor-pointer select-none active:scale-[0.99] active:duration-100"
            onClick={handleCardClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2.5 max-w-[72%]">
                    <div className={`w-4 h-4 rounded-full ${prompt.color} shrink-0`} />
                    <h3 className="font-display font-semibold text-[13px] text-text-primary truncate leading-tight" title={prompt.title}>
                        {prompt.title}
                    </h3>
                </div>

                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {!prompt.isDeleted && (
                        <button onClick={() => onToggleFavorite(prompt.id)}
                            className={`p-1.5 rounded-lg transition-all duration-200 ${prompt.isFavorite ? "text-amber-400" : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-amber-400"}`}>
                            <Star size={13} fill={prompt.isFavorite ? "currentColor" : "none"} />
                        </button>
                    )}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)}
                            className="text-text-muted opacity-0 group-hover:opacity-100 hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-glass-hover transition-all duration-200">
                            <MoreHorizontal size={13} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-36 bg-[#09090b] !bg-opacity-100 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 px-1 flex flex-col gap-0.5" style={{ backgroundColor: '#09090b' }}>
                                {!prompt.isDeleted ? (
                                    <>
                                        <button onClick={() => { onEdit(prompt); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/90 hover:bg-white/5 rounded-lg text-left transition-colors">
                                            <Pencil size={18} className="text-white/70" />
                                            <span className="font-medium">Edit</span>
                                        </button>
                                        <button onClick={() => { onCopy(prompt.content); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/90 hover:bg-white/5 rounded-lg text-left transition-colors">
                                            <Copy size={18} className="text-white/70" />
                                            <span className="font-medium">Copiar</span>
                                        </button>
                                        <button onClick={() => { setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/90 hover:bg-white/5 rounded-lg text-left transition-colors">
                                            <FolderSync size={18} className="text-white/70" />
                                            <span className="font-medium">Move</span>
                                        </button>
                                        <button onClick={() => { onDelete(prompt.id); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 rounded-lg text-left transition-colors">
                                            <Trash2 size={18} />
                                            <span className="font-medium">Delete</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { onRestore(prompt.id); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-left transition-colors">
                                            <RotateCcw size={18} />
                                            <span className="font-medium">Recover</span>
                                        </button>
                                        <button onClick={() => { onPermanentlyDelete(prompt.id); setShowMenu(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 rounded-lg text-left transition-colors">
                                            <Trash2 size={18} />
                                            <span className="font-medium">Delete</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content — NO gradient overlay */}
            <div className="flex-1 overflow-hidden mb-2.5">
                <p className="text-text-secondary text-[11px] leading-[1.65] tracking-wide font-body">
                    {prompt.content.length > 180 ? prompt.content.substring(0, 180) + "…" : prompt.content}
                </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-default/30">
                <div className="flex items-center gap-1.5">
                    {categoryName && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] font-semibold text-text-muted bg-bg-glass px-2 py-0.5 rounded border border-border-default">
                            <Tag size={7} />{categoryName}
                        </span>
                    )}
                    {prompt.isDeleted && (
                        <span className="text-[9px] uppercase tracking-[0.08em] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">LIXEIRA</span>
                    )}
                </div>

                {/* Drag Handle */}
                <div {...listeners}
                    className="text-text-muted/30 group-hover:text-text-muted hover:text-text-secondary transition-colors cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-bg-glass-hover"
                    onClick={(e) => e.stopPropagation()} title="Arrastar para reordenar">
                    <GripVertical size={14} />
                </div>
            </div>
        </div>
    );
}

// ── CategorySelect ──
function CategorySelect({
    value,
    onChange,
    categories
}: {
    value: string;
    onChange: (id: string) => void;
    categories: PsCategory[]
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedCategory = categories.find(c => c.id === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#fafafa] focus:outline-none focus:border-[#10b981]/40 focus:ring-1 focus:ring-[#10b981]/20 transition-all shadow-sm"
            >
                <span className={selectedCategory ? "text-[#fafafa]" : "text-[#71717a]"}>
                    {selectedCategory ? selectedCategory.name : "Sem categoria"}
                </span>
                <ChevronDown size={14} className={`text-[#71717a] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl z-[60] overflow-hidden py-1">
                    <button
                        type="button"
                        onClick={() => { onChange(""); setIsOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${!value ? "bg-[#10b981]/10 text-[#10b981]" : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"}`}
                    >
                        Sem categoria
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => { onChange(cat.id); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${value === cat.id ? "bg-[#10b981]/10 text-[#10b981]" : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── PromptDetailModal ──
function PromptDetailModal({
    prompt, categories, onClose, onEdit, onCopy, onToggleFavorite, onDelete,
}: {
    prompt: PsPrompt; categories: PsCategory[]; onClose: () => void;
    onEdit: (p: PsPrompt) => void; onCopy: (text: string) => void;
    onToggleFavorite: (id: string) => void; onDelete: (id: string) => void;
}) {
    const categoryName = prompt.folderId ? categories.find((c) => c.id === prompt.folderId)?.name : null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-2xl bg-bg-surface border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border-default">
                    <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full ${prompt.color}`} />
                        <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">{prompt.title}</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onToggleFavorite(prompt.id)}
                            className={`p-2 rounded-lg transition-colors duration-200 ${prompt.isFavorite ? "text-amber-400" : "text-text-muted hover:text-amber-400"}`}>
                            <Star size={16} fill={prompt.isFavorite ? "currentColor" : "none"} /></button>
                        <button onClick={() => { onEdit(prompt); onClose(); }}
                            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors duration-200"><Pencil size={16} /></button>
                        <button onClick={() => onCopy(prompt.content)}
                            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors duration-200"><Copy size={16} /></button>
                        <button onClick={onClose}
                            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors duration-200 ml-1"><X size={16} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {categoryName && (
                        <div className="mb-4">
                            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-semibold text-text-muted bg-bg-glass px-2.5 py-1 rounded-lg border border-border-default">
                                <Tag size={9} />{categoryName}
                            </span>
                        </div>
                    )}
                    <div className="prompt-text bg-bg-glass rounded-xl p-5 border border-border-default">{prompt.content}</div>
                </div>
                <div className="px-6 py-4 border-t border-border-default flex items-center justify-between">
                    <span className="text-[11px] text-text-muted font-mono tracking-wide">
                        {new Date(prompt.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {!prompt.isDeleted && (
                        <button onClick={() => { onDelete(prompt.id); onClose(); }}
                            className="flex items-center gap-1.5 text-[11px] text-red-400/50 hover:text-red-400 transition-colors duration-200">
                            <Trash2 size={11} /> Mover para Lixeira</button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── PromptModal (Create/Edit) ──
function PromptModal({
    isOpen, onClose, onSave, categories, initialData, activeCategoryId,
}: {
    isOpen: boolean; onClose: () => void;
    onSave: (data: Omit<PsPrompt, "id" | "createdAt">) => void;
    categories: PsCategory[]; initialData?: PsPrompt | null; activeCategoryId: string | null;
}) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [categoryId, setCategoryId] = useState<string>("");
    const [color, setColor] = useState(COLORS[0].value);
    const [isEnhancing, setIsEnhancing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) { setTitle(initialData.title); setContent(initialData.content); setCategoryId(initialData.folderId || ""); setColor(initialData.color); }
            else { setTitle(""); setContent(""); setCategoryId(activeCategoryId || ""); setColor(COLORS[Math.floor(Math.random() * COLORS.length)].value); }
        }
    }, [isOpen, initialData, activeCategoryId]);

    if (!isOpen) return null;

    const handleEnhance = async () => {
        if (!content.trim()) return;
        setIsEnhancing(true);
        try {
            const res = await fetch("/api/promptsave/enhance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: content }) });
            if (res.ok) { const data = await res.json(); setContent(data.enhanced || content); }
        } catch (e) { console.error("Enhancement failed:", e); }
        setIsEnhancing(false);
    };

    const handleSave = () => {
        if (!title.trim() || !content.trim()) return;
        onSave({ title, content, folderId: categoryId || null, color, isFavorite: initialData?.isFavorite, isDeleted: initialData?.isDeleted });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-2xl bg-bg-surface border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-border-default">
                    <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">{initialData ? "Editar Prompt" : "Novo Prompt"}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#18181b]">
                    <div>
                        <label className="text-xs font-medium text-[#71717a] mb-1.5 uppercase tracking-wider block">Título</label>
                        <input type="text" placeholder="ex: Prompt para Fotografia de Retrato" value={title} onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#10b981]/40 focus:ring-1 focus:ring-[#10b981]/20 transition-all font-body shadow-sm" />
                    </div>
                    <div className="relative">
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Prompt</label>
                            <button onClick={handleEnhance} disabled={isEnhancing || !content.trim()}
                                className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors font-medium">
                                {isEnhancing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Melhorar com IA
                            </button>
                        </div>
                        <textarea placeholder="Digite seu prompt aqui..." value={content} onChange={(e) => setContent(e.target.value)}
                            className="w-full h-44 bg-bg-glass border border-border-default rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none font-mono text-xs leading-relaxed shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-xs font-medium text-[#71717a] mb-1.5 uppercase tracking-wider block">Categoria</label>
                            <CategorySelect value={categoryId} categories={categories} onChange={setCategoryId} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[#71717a] mb-1.5 uppercase tracking-wider block">Cor</label>
                            <div className="flex flex-wrap gap-1.5">
                                {COLORS.map((c) => (
                                    <button key={c.id} type="button" onClick={() => setColor(c.value)}
                                        className={`w-6 h-6 rounded-full ${c.value} transition-transform hover:scale-110 ring-2 ring-offset-1 ring-offset-bg-surface ${color === c.value ? "ring-white" : "ring-transparent"}`}
                                        title={c.label} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-border-default flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
                    <button onClick={handleSave} disabled={!title.trim() || !content.trim()}
                        className="px-6 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20">
                        {initialData ? "Salvar" : "Criar Prompt"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── CategoryFilterBar ──
function CategoryFilterBar({ categories, activeFilters, onToggleFilter, onCreateCategory }: {
    categories: PsCategory[]; activeFilters: string[]; onToggleFilter: (id: string) => void; onCreateCategory: (name: string) => void;
}) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()));

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {activeFilters.map((filterId) => {
                const category = categories.find((c) => c.id === filterId);
                if (!category) return null;
                return (
                    <button key={filterId} onClick={() => onToggleFilter(filterId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 transition-all hover:bg-emerald-500/15 tracking-wide">
                        <Tag size={9} />{category.name}<X size={9} className="ml-0.5 opacity-60" />
                    </button>
                );
            })}
            <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border tracking-wide cursor-pointer ${showDropdown
                        ? "bg-emerald-500/10 text-text-primary border-emerald-500/30"
                        : "text-text-muted hover:text-text-primary border-border-default hover:border-emerald-500/30 hover:bg-emerald-500/5"}`}>
                    <Filter size={9} /> Filtrar <ChevronDown size={9} className={`transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`} />
                </button>
                {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-52 bg-bg-surface border border-border-default rounded-xl shadow-2xl z-30 overflow-hidden">
                        <div className="p-2">
                            <div className="relative">
                                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input type="text" placeholder="Buscar categorias..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)}
                                    className="w-full bg-bg-glass border border-border-default rounded-lg py-1.5 pl-7 pr-4 text-[11px] text-text-primary placeholder-text-muted focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors" autoFocus />
                            </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto px-1 pb-1">
                            {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && <p className="text-[11px] text-text-muted text-center py-3">{categorySearch.trim() ? "Nenhuma categoria encontrada" : "Nenhuma categoria criada"}</p>}
                            {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).map((c) => {
                                const isActive = activeFilters.includes(c.id);
                                return (
                                    <button key={c.id} onClick={() => onToggleFilter(c.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-lg transition-colors text-left ${isActive
                                            ? "bg-emerald-500/10 text-emerald-400" : "text-text-secondary hover:bg-bg-glass-hover hover:text-text-primary"}`}>
                                        <Tag size={9} />{c.name}{isActive && <span className="ml-auto text-emerald-400 text-[10px]">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="border-t border-border-default p-2">
                            <div className="flex items-center gap-1.5">
                                <input type="text" placeholder="Nova categoria..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && newCategoryName.trim()) { onCreateCategory(newCategoryName.trim()); setNewCategoryName(""); } }}
                                    className="flex-1 bg-bg-glass border border-border-default rounded-lg py-1.5 px-2.5 text-[11px] text-text-primary placeholder-text-muted focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors" />
                                <button onClick={() => { if (newCategoryName.trim()) { onCreateCategory(newCategoryName.trim()); setNewCategoryName(""); } }}
                                    disabled={!newCategoryName.trim()} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 transition-colors">
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Vault Page ──
export default function VaultPage() {
    const [categories, setCategories] = useState<PsCategory[]>([]);
    const [prompts, setPrompts] = useState<PsPrompt[]>([]);
    const { psActiveSection: activeSection, psPromptCount: promptCount, setPsPromptCount } = useAppStore();
    const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<PsPrompt | null>(null);
    const [viewingPrompt, setViewingPrompt] = useState<PsPrompt | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<PsCategory | null>(null);
    const openPromptCategoryModal = usePromptCategoryStore(s => s.openModal);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Load from API
    const loadData = useCallback(async () => {
        try {
            const [categoriesRes, promptsRes] = await Promise.all([
                fetch("/api/promptsave/folders"), fetch("/api/promptsave/prompts"),
            ]);
            if (categoriesRes.ok) { const cd = await categoriesRes.json(); setCategories(cd.folders); }
            if (promptsRes.ok) {
                const pd = await promptsRes.json();
                setPrompts(pd.prompts);
                // Update total count excluding deleted
                const total = pd.prompts.filter((p: any) => !p.isDeleted).length;
                setPsPromptCount(total);
            }
        } catch (err) { console.error("Error loading data:", err); }
        finally { setIsLoaded(true); }
    }, [setPsPromptCount]);

    useEffect(() => { loadData(); }, [loadData]);

    // Ouve mutações globais (como as feitas pelo PromptCategoryModal) para regeraretricamente atualizar a lista de categorias do vault em tempo real
    useEffect(() => {
        const handleRefresh = () => loadData();
        window.addEventListener('promptsave-mutated', handleRefresh);
        return () => window.removeEventListener('promptsave-mutated', handleRefresh);
    }, [loadData]);

    // Update count when prompts change locally
    useEffect(() => {
        const total = prompts.filter((p) => !p.isDeleted).length;
        setPsPromptCount(total);
    }, [prompts, setPsPromptCount]);

    // ── Drag & Drop ──
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = prompts.findIndex((p) => p.id === active.id);
        const newIndex = prompts.findIndex((p) => p.id === over.id);
        const reordered = arrayMove(prompts, oldIndex, newIndex);
        setPrompts(reordered);

        // Persist to DB
        try {
            await fetch("/api/promptsave/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
            });
        } catch (err) { console.error("Error saving order:", err); }
    };

    // ── Handlers ──
    const handleCreateCategory = async (name: string) => {
        try {
            const res = await fetch("/api/promptsave/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
            if (res.ok) { const { id } = await res.json(); setCategories([...categories, { id, name, createdAt: Date.now() }]); }
        } catch (err) { console.error(err); }
    };

    const handleEditCategory = async (id: string, newName: string) => {
        try {
            const res = await fetch("/api/promptsave/folders", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name: newName })
            });
            if (res.ok) {
                setCategories(categories.map(c => c.id === id ? { ...c, name: newName } : c));
                setEditingCategory(null);
            }
        } catch (err) { console.error(err); }
    };

    const handleSavePrompt = async (data: Omit<PsPrompt, "id" | "createdAt">) => {
        try {
            if (editingPrompt) {
                const res = await fetch("/api/promptsave/prompts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingPrompt.id, ...data }) });
                if (res.ok) setPrompts(prompts.map((p) => (p.id === editingPrompt.id ? { ...p, ...data } : p)));
            } else {
                const res = await fetch("/api/promptsave/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
                if (res.ok) { const { id } = await res.json(); setPrompts([{ id, createdAt: Date.now(), isFavorite: false, isDeleted: false, ...data }, ...prompts]); }
            }
            setEditingPrompt(null);
        } catch (err) { console.error(err); }
    };

    const handleSoftDelete = async (id: string) => {
        try {
            await fetch("/api/promptsave/prompts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "softDelete" }) });
            setPrompts(prompts.map((p) => (p.id === id ? { ...p, isDeleted: true } : p)));
        } catch (err) { console.error(err); }
    };

    const handleRestore = async (id: string) => {
        try {
            await fetch("/api/promptsave/prompts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "restore" }) });
            setPrompts(prompts.map((p) => (p.id === id ? { ...p, isDeleted: false } : p)));
        } catch (err) { console.error(err); }
    };

    const handlePermanentDelete = async (id: string) => {
        if (!confirm("Esta ação não pode ser desfeita. Excluir para sempre?")) return;
        try { await fetch(`/api/promptsave/prompts?id=${id}`, { method: "DELETE" }); setPrompts(prompts.filter((p) => p.id !== id)); } catch (err) { console.error(err); }
    };

    const handleToggleFavorite = async (id: string) => {
        try {
            await fetch("/api/promptsave/prompts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "toggleFavorite" }) });
            setPrompts(prompts.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)));
            if (viewingPrompt?.id === id) setViewingPrompt({ ...viewingPrompt, isFavorite: !viewingPrompt.isFavorite });
        } catch (err) { console.error(err); }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setToastMessage("Prompt copiado para a área de transferência!");
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleToggleCategoryFilter = (categoryId: string) => {
        setActiveCategoryFilters((prev) => prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]);
    };

    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // ── Filtering ──
    const getFilteredPrompts = useCallback(() => {
        const q = searchQuery.toLowerCase();
        let filtered = prompts.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
        if (activeSection === "TRASH") return filtered.filter((p) => p.isDeleted);
        filtered = filtered.filter((p) => !p.isDeleted);
        if (activeSection === "FAVORITES") return filtered.filter((p) => p.isFavorite);
        if (activeCategoryFilters.length > 0) filtered = filtered.filter((p) => p.folderId && activeCategoryFilters.includes(p.folderId));
        return filtered;
    }, [prompts, searchQuery, activeSection, activeCategoryFilters]);

    const filteredPrompts = getFilteredPrompts();
    const isTrashView = activeSection === "TRASH";
    const isCategoriesView = activeSection === "CATEGORIES";

    if (!isLoaded) return (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 text-text-muted animate-spin" /></div>
    );

    const getSectionDetails = () => {
        switch (activeSection) {
            case "FAVORITES": return { title: "Favoritos", icon: <Star className="w-6 h-6 text-white fill-white" /> };
            case "TRASH": return { title: "Lixeira", icon: <Trash2 className="w-6 h-6 text-white" /> };
            case "CATEGORIES": return { title: "Categorias", icon: <Tag className="w-6 h-6 text-white" /> };
            default: return { title: "Prompt Vault", icon: <BookmarkCheck className="w-6 h-6 text-white" /> };
        }
    };
    const sectionDetails = getSectionDetails();

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                        {sectionDetails.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-display font-bold text-2xl text-text-primary tracking-tight">
                                {sectionDetails.title}
                            </h1>
                            {!isCategoriesView && (
                                <span className="text-[10px] font-mono text-text-muted bg-bg-glass px-1.5 py-0.5 rounded-full border border-border-default">{filteredPrompts.length}</span>
                            )}
                            {isCategoriesView && (
                                <span className="text-[10px] font-mono text-text-muted bg-bg-glass px-1.5 py-0.5 rounded-full border border-border-default">{categories.length}</span>
                            )}
                        </div>
                        <p className="text-sm text-text-muted hidden sm:block">
                            {isCategoriesView ? "Gerencie suas categorias de prompts" : "Gerencie e organize seus prompts"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!isCategoriesView && !isTrashView && (
                        <>
                            <button onClick={() => setShowSearch(!showSearch)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${showSearch ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-bg-glass border-border-default text-text-secondary hover:text-text-primary hover:border-emerald-500/30'}`}>
                                <Search size={18} />
                            </button>
                            <button onClick={() => setShowFilters(!showFilters)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${showFilters || activeCategoryFilters.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-bg-glass border-border-default text-text-secondary hover:text-text-primary hover:border-emerald-500/30'}`}>
                                <Filter size={18} />
                                {activeCategoryFilters.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>}
                            </button>
                        </>
                    )}
                    <button onClick={() => { setEditingPrompt(null); setIsPromptModalOpen(true); }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20">
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar Toggle */}
            {showSearch && !isCategoriesView && (
                <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-emerald-400" size={16} />
                        <input type="text" placeholder="Pesquisar prompts em tudo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-bg-surface border border-border-default rounded-xl py-3 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all font-body shadow-sm" autoFocus />
                    </div>
                </div>
            )}

            {/* Filter Bar Toggle */}
            {(showFilters || activeCategoryFilters.length > 0) && activeSection === "ALL" && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-default/50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider">
                        <Filter size={12} />
                        Filtros de Categoria
                    </div>
                    <CategoryFilterBar categories={categories} activeFilters={activeCategoryFilters} onToggleFilter={handleToggleCategoryFilter} onCreateCategory={handleCreateCategory} />
                </div>
            )}

            {/* Empty State */}
            {filteredPrompts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border-default rounded-2xl bg-bg-glass/20">
                    <div className="w-12 h-12 bg-bg-surface rounded-full flex items-center justify-center mb-3 text-text-muted">
                        {isTrashView ? <Trash2 size={22} /> : activeSection === "FAVORITES" ? <Star size={22} /> : <BookmarkCheck size={22} />}
                    </div>
                    <h3 className="text-sm font-display font-semibold text-text-primary mb-1">{isTrashView ? "A lixeira está vazia" : "Nenhum prompt encontrado"}</h3>
                    <p className="text-text-muted text-[11px] max-w-xs mb-4 font-body leading-relaxed">
                        {searchQuery ? `Sem resultados para "${searchQuery}"` : isTrashView ? "Itens movidos para a lixeira aparecerão aqui." : activeSection === "FAVORITES" ? "Marque prompts favoritos para vê-los aqui." : "Crie um prompt para começar."}
                    </p>
                    {!isTrashView && activeSection !== "FAVORITES" && (
                        <button onClick={() => { setEditingPrompt(null); setIsPromptModalOpen(true); }}
                            className="text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:underline cursor-pointer transition-all">Criar um prompt</button>
                    )}
                </div>
            )}

            {/* Main Content Area */}
            {isCategoriesView ? (
                <div className="bg-bg-surface border border-border-default rounded-2xl p-6 mt-4 animate-in fade-in duration-300 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Suas Categorias</h2>
                        <div className="text-xs text-text-muted">{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* New Category Input inline for convenience in this view */}
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Criar nova categoria..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        handleCreateCategory(e.currentTarget.value.trim());
                                        e.currentTarget.value = '';
                                    }
                                }}
                                className="flex-1 bg-bg-glass border border-border-default rounded-xl py-2.5 px-4 text-sm text-text-primary focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all font-body"
                            />
                        </div>

                        {categories.length === 0 ? (
                            <div className="text-center py-10 text-text-muted text-sm border border-dashed border-border-default rounded-xl">
                                Nenhuma categoria criada ainda.
                            </div>
                        ) : (
                            categories.map(cat => {
                                const promptCount = prompts.filter(p => p.folderId === cat.id && !p.isDeleted).length;
                                return (
                                    <div key={cat.id} className="flex items-center justify-between bg-bg-glass border border-border-default hover:border-emerald-500/30 rounded-xl p-4 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Tag className="text-emerald-500" size={16} />
                                            <span className="font-medium text-text-primary">{cat.name}</span>
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full ml-2">
                                                {promptCount} {promptCount === 1 ? 'prompt' : 'prompts'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openPromptCategoryModal(
                                                        cat.id,
                                                        cat.name,
                                                        prompts.filter(p => p.folderId === cat.id && !p.isDeleted).map(p => ({
                                                            id: p.id,
                                                            title: p.title,
                                                            folderId: p.folderId,
                                                            contentSnippet: p.content.substring(0, 100)
                                                        }))
                                                    );
                                                }}
                                                className="text-text-muted hover:text-emerald-400 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors z-20 relative cursor-pointer"
                                                title="Gerenciar Prompts da Categoria"
                                            >
                                                <FolderSync size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingCategory(cat)}
                                                className="text-text-muted hover:text-emerald-400 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                                title="Editar Categoria"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"? Os prompts não serão excluídos, apenas perderão a categoria.`)) {
                                                        try {
                                                            await fetch(`/api/promptsave/folders?id=${cat.id}`, { method: "DELETE" });
                                                            setCategories(categories.filter(c => c.id !== cat.id));
                                                            setPrompts(prompts.map(p => p.folderId === cat.id ? { ...p, folderId: null } : p));
                                                        } catch (e) {
                                                            console.error(e);
                                                        }
                                                    }
                                                }}
                                                className="text-text-muted hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title="Excluir Categoria"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Grid with drag & drop */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredPrompts.map((p) => p.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4 relative z-0">
                                {filteredPrompts.map((prompt) => (
                                    <SortablePromptCard key={prompt.id} prompt={prompt} categories={categories}
                                        onEdit={(p) => { setEditingPrompt(p); setIsPromptModalOpen(true); }}
                                        onDelete={handleSoftDelete} onRestore={handleRestore}
                                        onPermanentlyDelete={handlePermanentDelete}
                                        onToggleFavorite={handleToggleFavorite} onCopy={handleCopy}
                                        onClick={(p) => setViewingPrompt(p)} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </>
            )}

            {/* Detail Modal */}
            {viewingPrompt && <PromptDetailModal prompt={viewingPrompt} categories={categories} onClose={() => setViewingPrompt(null)}
                onEdit={(p) => { setEditingPrompt(p); setIsPromptModalOpen(true); }} onCopy={handleCopy} onToggleFavorite={handleToggleFavorite} onDelete={handleSoftDelete} />}

            {/* Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 bg-[#18181b] border border-emerald-500/30 text-white px-5 py-3 rounded-full shadow-2xl shadow-emerald-900/20 backdrop-blur-md"
                    >
                        <Check size={16} className="text-emerald-400" />
                        <span className="text-sm font-medium tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create/Edit Modal */}
            <PromptModal isOpen={isPromptModalOpen} onClose={() => { setIsPromptModalOpen(false); setEditingPrompt(null); }}
                onSave={handleSavePrompt} categories={categories} initialData={editingPrompt}
                activeCategoryId={activeCategoryFilters.length === 1 ? activeCategoryFilters[0] : null} />

            {/* Edit Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setEditingCategory(null)}>
                    <div className="w-full max-w-sm bg-bg-surface border border-border-default rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-default">
                            <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">Editar Categoria</h2>
                            <button onClick={() => setEditingCategory(null)} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-6 bg-[#18181b]">
                            <label className="text-xs font-medium text-[#71717a] mb-1.5 uppercase tracking-wider block">Nome da Categoria</label>
                            <input type="text" value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                onKeyDown={(e) => { if (e.key === "Enter" && editingCategory.name.trim()) handleEditCategory(editingCategory.id, editingCategory.name.trim()); }}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#fafafa] focus:outline-none focus:border-[#10b981]/40 focus:ring-1 focus:ring-[#10b981]/20 transition-all font-body shadow-sm" autoFocus />
                        </div>
                        <div className="p-5 border-t border-border-default flex justify-end gap-3">
                            <button onClick={() => setEditingCategory(null)} className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
                            <button onClick={() => { if (editingCategory.name.trim()) handleEditCategory(editingCategory.id, editingCategory.name.trim()); }} disabled={!editingCategory.name.trim()}
                                className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Category Context Modal */}
            <PromptCategoryModal />
        </div>
    );
}
