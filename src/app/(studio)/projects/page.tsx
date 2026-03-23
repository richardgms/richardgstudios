"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FolderOpen, Plus, Trash2, Loader2, ImageIcon, Pencil, Check, X,
    Zap, Diamond, Sparkles,
} from "lucide-react";
import Link from "next/link";

interface ProjectItem {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    image_count: number;
}

const MODEL_BADGES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    flash: { icon: <Zap className="w-3 h-3" />, label: "Flash", color: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
    pro: { icon: <Diamond className="w-3 h-3" />, label: "Nano Banana 2", color: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
    imagen: { icon: <Sparkles className="w-3 h-3" />, label: "Imagen", color: "text-blue-300 bg-blue-500/20 border-blue-500/30" },
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
            });
            if (res.ok) {
                setNewName("");
                setNewDesc("");
                setShowCreate(false);
                fetchProjects();
            }
        } catch { /* silent */ }
    };

    const handleEdit = async (id: string) => {
        if (!editName.trim()) return;
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || undefined }),
            });
            if (res.ok) {
                setEditingId(null);
                fetchProjects();
            }
        } catch { /* silent */ }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDeletingId(null);
                setProjects((prev) => prev.filter((p) => p.id !== id));
            }
        } catch { /* silent */ }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <h1 className="font-display font-bold text-2xl text-text-primary mb-6">Projetos</h1>
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Carregando projetos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl text-text-primary">Projetos</h1>
                <div className="flex items-center gap-3">
                    {projects.length > 0 && (
                        <span className="text-xs text-text-muted bg-bg-glass border border-border-default px-3 py-1.5 rounded-full">
                            {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
                        </span>
                    )}
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Projeto
                    </button>
                </div>
            </div>

            {/* Criar Projeto */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-card p-4 space-y-3">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                placeholder="Nome do projeto..."
                                className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                                autoFocus
                            />
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Descrição (opcional)..."
                                rows={2}
                                className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }}
                                    className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg transition-colors"
                                >
                                    Criar Projeto
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lista de Projetos */}
            {projects.length === 0 && !showCreate ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 glass-card"
                >
                    <FolderOpen className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">Nenhum projeto ainda</p>
                    <p className="text-xs text-text-muted mt-1">
                        Crie um projeto para organizar suas gerações
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {projects.map((project) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="glass-card overflow-hidden group"
                            >
                                {editingId === project.id ? (
                                    /* Modo de edição */
                                    <div className="p-4 space-y-3">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleEdit(project.id)}
                                            className="w-full px-3 py-2 bg-bg-glass border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-focus"
                                            autoFocus
                                        />
                                        <textarea
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            placeholder="Descrição..."
                                            rows={2}
                                            className="w-full px-3 py-2 bg-bg-glass border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex-1 py-2 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover"
                                            >
                                                <X className="w-3.5 h-3.5 inline mr-1" />Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleEdit(project.id)}
                                                disabled={!editName.trim()}
                                                className="flex-1 py-2 text-xs font-medium bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg"
                                            >
                                                <Check className="w-3.5 h-3.5 inline mr-1" />Salvar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Modo de visualização */
                                    <Link href={`/projects/${project.id}`} className="block">
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
                                                        <FolderOpen className="w-5 h-5 text-accent-light" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-medium text-text-primary leading-tight">
                                                            {project.name}
                                                        </h3>
                                                        {project.description && (
                                                            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                                                                {project.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setEditingId(project.id);
                                                            setEditName(project.name);
                                                            setEditDesc(project.description || "");
                                                        }}
                                                        className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-glass-hover"
                                                        title="Editar projeto"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setDeletingId(project.id);
                                                        }}
                                                        className="p-1.5 text-text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                                        title="Excluir projeto"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-border-default">
                                                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    {project.image_count} {project.image_count === 1 ? "imagem" : "imagens"}
                                                </div>
                                                <span className="text-[10px] text-text-muted">
                                                    {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal de Confirmação para Excluir */}
            <AnimatePresence>
                {deletingId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDeletingId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-bg-surface border border-border-default rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="p-3 bg-red-500/10 rounded-full text-red-400 mb-2">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary">Excluir Projeto?</h3>
                                <p className="text-sm text-text-secondary">
                                    O projeto será excluído, mas as imagens vinculadas serão mantidas.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeletingId(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deletingId)}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium text-sm"
                                >
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
