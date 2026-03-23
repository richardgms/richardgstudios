"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const COLORS = [
    { value: "bg-red-500", hex: "#ef4444" },
    { value: "bg-orange-500", hex: "#f97316" },
    { value: "bg-amber-500", hex: "#f59e0b" },
    { value: "bg-emerald-500", hex: "#10b981" },
    { value: "bg-teal-500", hex: "#14b8a6" },
    { value: "bg-cyan-500", hex: "#06b6d4" },
    { value: "bg-blue-500", hex: "#3b82f6" },
    { value: "bg-indigo-500", hex: "#6366f1" },
    { value: "bg-purple-500", hex: "#a855f7" },
    { value: "bg-pink-500", hex: "#ec4899" },
    { value: "bg-gray-500", hex: "#6b7280" },
];

interface Label {
    id: string;
    boardId: string;
    name: string;
    color: string;
}

interface BoardSettingsModalProps {
    board: { id: string; name: string; description: string | null; color: string };
    labels: Label[];
    onClose: () => void;
    onRefresh: () => void;
}

export function BoardSettingsModal({ board, labels, onClose, onRefresh }: BoardSettingsModalProps) {
    const router = useRouter();
    const [name, setName] = useState(board.name);
    const [color, setColor] = useState(board.color);
    const [newLabelName, setNewLabelName] = useState("");
    const [newLabelColor, setNewLabelColor] = useState("#f59e0b");
    const [localLabels, setLocalLabels] = useState(labels);

    const handleSave = async () => {
        await fetch(`/api/kanboard/boards/${board.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
        });
        onRefresh();
        onClose();
    };

    const handleDelete = async () => {
        await fetch(`/api/kanboard/boards/${board.id}`, { method: "DELETE" });
        router.push("/boards");
    };

    const handleAddLabel = async () => {
        if (!newLabelName.trim()) return;
        const res = await fetch("/api/kanboard/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: board.id, name: newLabelName, color: newLabelColor }),
        });
        const data = await res.json();
        setLocalLabels(prev => [...prev, { id: data.id, boardId: board.id, name: newLabelName, color: newLabelColor }]);
        setNewLabelName("");
        onRefresh();
    };

    const handleDeleteLabel = async (id: string) => {
        await fetch(`/api/kanboard/labels?id=${id}`, { method: "DELETE" });
        setLocalLabels(prev => prev.filter(l => l.id !== id));
        onRefresh();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-bg-surface border border-border-default rounded-2xl p-6 shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-display font-bold text-lg text-text-primary">Configurações do Quadro</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-glass-hover text-text-muted">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-bg-glass border border-border-default text-sm text-text-primary focus:outline-none kb-focus-accent"
                            />
                        </div>

                        {/* Color */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Cor</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setColor(c.value)}
                                        className={`w-7 h-7 rounded-full transition-all ${color === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-bg-surface scale-110" : "hover:scale-110"}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Labels */}
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Labels</label>
                            <div className="space-y-1.5 mb-3">
                                {localLabels.map((label) => (
                                    <div key={label.id} className="flex items-center gap-2 group">
                                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                        <span className="text-sm text-text-primary flex-1">{label.name}</span>
                                        <button
                                            onClick={() => handleDeleteLabel(label.id)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={newLabelColor}
                                    onChange={(e) => setNewLabelColor(e.target.value)}
                                    className="w-9 h-9 rounded-lg border border-border-default cursor-pointer bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={newLabelName}
                                    onChange={(e) => setNewLabelName(e.target.value)}
                                    placeholder="Nome da label..."
                                    className="flex-1 px-3 py-2 rounded-lg bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddLabel(); }}
                                />
                                <button onClick={handleAddLabel} disabled={!newLabelName.trim()} className="p-2 rounded-lg kb-accent-gradient disabled:opacity-40">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Excluir quadro
                        </button>
                        <div className="flex-1" />
                        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-glass-hover transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="px-4 py-2.5 rounded-xl kb-accent-gradient text-sm font-medium transition-all">
                            Salvar
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
