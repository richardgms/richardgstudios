"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Columns3 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BoardCard } from "@/components/kanboard/BoardCard";
import { BoardEmptyState } from "@/components/kanboard/BoardEmptyState";

interface KbBoard {
    id: string;
    name: string;
    description: string | null;
    color: string;
    isFavorite: boolean;
    isDeleted: boolean;
    sortOrder: number;
    columnCount: number;
    cardCount: number;
}

type ColorOption = { id: string; value: string; label: string; hex: string };

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

const TEMPLATES = [
    { id: "blank", name: "Em branco", desc: "Sem colunas" },
    { id: "basic", name: "Básico", desc: "A Fazer / Em Progresso / Concluído" },
    { id: "dev", name: "Desenvolvimento", desc: "Backlog / A Fazer / Em Progresso / Revisão / Concluído" },
    { id: "content", name: "Conteúdo", desc: "Ideias / Rascunho / Revisão / Publicado" },
];

export default function BoardsPage() {
    const [boards, setBoards] = useState<KbBoard[]>([]);
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newColor, setNewColor] = useState("bg-amber-500");
    const [newTemplate, setNewTemplate] = useState("basic");
    const [showEdit, setShowEdit] = useState(false);
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);

    const resetForm = () => {
        setNewName("");
        setNewDesc("");
        setNewColor("bg-amber-500");
        setNewTemplate("basic");
    };

    const handleCreateClick = () => {
        resetForm();
        setShowCreate(true);
    };

    const handleEditClick = (id: string) => {
        const board = boards.find(b => b.id === id);
        if (board) {
            setEditingBoardId(board.id);
            setNewName(board.name);
            setNewDesc(board.description || "");
            setNewColor(board.color);
            setShowEdit(true);
        }
    };
    const { kbActiveSection, setKbBoardCount } = useAppStore();

    const fetchBoards = useCallback(async () => {
        try {
            const res = await fetch("/api/kanboard/boards");
            const data = await res.json();
            if (data.boards) {
                setBoards(data.boards);
                setKbBoardCount(data.boards.filter((b: KbBoard) => !b.isDeleted).length);
            }
        } catch { }
    }, [setKbBoardCount]);

    useEffect(() => { fetchBoards(); }, [fetchBoards]);

    const filteredBoards = boards.filter(b => {
        if (kbActiveSection === "FAVORITES") return !b.isDeleted && b.isFavorite;
        if (kbActiveSection === "TRASH") return b.isDeleted;
        return !b.isDeleted;
    }).filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await fetch("/api/kanboard/boards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, description: newDesc || null, color: newColor, template: newTemplate }),
        });
        setShowCreate(false);
        resetForm();
        fetchBoards();
    };

    const handleUpdate = async () => {
        if (!newName.trim() || !editingBoardId) return;
        
        await fetch(`/api/kanboard/boards/${editingBoardId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, description: newDesc || null, color: newColor }),
        });
        
        setShowEdit(false);
        setEditingBoardId(null);
        resetForm();
        fetchBoards();
    };

    const handleToggleFavorite = async (id: string) => {
        await fetch(`/api/kanboard/boards/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggleFavorite" }),
        });
        fetchBoards();
    };

    const handleSoftDelete = async (id: string) => {
        await fetch(`/api/kanboard/boards/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "softDelete" }),
        });
        fetchBoards();
    };

    const handleRestore = async (id: string) => {
        await fetch(`/api/kanboard/boards/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
        });
        fetchBoards();
    };

    const handleHardDelete = async (id: string) => {
        await fetch(`/api/kanboard/boards/${id}`, { method: "DELETE" });
        fetchBoards();
    };

    const sectionTitle = kbActiveSection === "FAVORITES" ? "Favoritos" : kbActiveSection === "TRASH" ? "Lixeira" : "Todos os Quadros";

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Columns3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-2xl text-text-primary">{sectionTitle}</h1>
                        <p className="text-xs text-text-muted">{filteredBoards.length} quadros</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl kb-accent-gradient font-medium text-sm transition-all hover:scale-105"
                >
                    <Plus className="w-4 h-4" /> Novo Quadro
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar quadros..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                />
            </div>

            {/* Grid */}
            {filteredBoards.length === 0 && !search ? (
                <BoardEmptyState onCreateBoard={handleCreateClick} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredBoards.map((board, i) => (
                            <motion.div
                                key={board.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <BoardCard
                                    board={board}
                                    onToggleFavorite={handleToggleFavorite}
                                    onSoftDelete={handleSoftDelete}
                                    onRestore={handleRestore}
                                    onHardDelete={handleHardDelete}
                                    onEdit={handleEditClick}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreate(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-bg-surface border border-border-default rounded-2xl p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-display font-bold text-lg text-text-primary">Novo Quadro</h2>
                                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-bg-glass-hover text-text-muted">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Nome</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Meu quadro..."
                                        className="w-full px-3 py-2.5 rounded-xl bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Descrição (opcional)</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Sobre o que é este quadro..."
                                        rows={2}
                                        className="w-full px-3 py-2.5 rounded-xl bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Cor</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setNewColor(c.value)}
                                                className={`w-7 h-7 rounded-full transition-all ${newColor === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-bg-surface scale-110" : "hover:scale-110"}`}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Template</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TEMPLATES.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setNewTemplate(t.id)}
                                                className={`px-3 py-2.5 rounded-xl text-left text-sm transition-all border ${newTemplate === t.id
                                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                    : "bg-bg-glass border-border-default text-text-secondary hover:bg-bg-glass-hover"
                                                    }`}
                                            >
                                                <p className="font-medium text-xs">{t.name}</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">{t.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-glass-hover transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 px-4 py-2.5 rounded-xl kb-accent-gradient text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                    Criar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEdit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => { setShowEdit(false); setEditingBoardId(null); resetForm(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-bg-surface border border-border-default rounded-2xl p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="font-display font-bold text-lg text-text-primary">Editar Quadro</h2>
                                <button onClick={() => { setShowEdit(false); setEditingBoardId(null); resetForm(); }} className="p-1.5 rounded-lg hover:bg-bg-glass-hover text-text-muted">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Nome</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Meu quadro..."
                                        className="w-full px-3 py-2.5 rounded-xl bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Descrição (opcional)</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Sobre o que é este quadro..."
                                        rows={2}
                                        className="w-full px-3 py-2.5 rounded-xl bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Cor</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setNewColor(c.value)}
                                                className={`w-7 h-7 rounded-full transition-all ${newColor === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-bg-surface scale-110" : "hover:scale-110"}`}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { setShowEdit(false); setEditingBoardId(null); resetForm(); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-glass-hover transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleUpdate} disabled={!newName.trim()} className="flex-1 px-4 py-2.5 rounded-xl kb-accent-gradient text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                    Salvar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
