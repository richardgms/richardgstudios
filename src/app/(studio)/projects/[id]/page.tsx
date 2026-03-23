"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FolderOpen, ArrowLeft, Loader2, ImageIcon, Pencil, Check, X,
    Download, Heart, HeartOff, Copy, Zap, Diamond, Sparkles, Maximize2,
    FolderMinus,
} from "lucide-react";
import Link from "next/link";

interface Generation {
    id: string;
    prompt: string;
    model: string;
    aspect_ratio: string;
    aspectRatio: string;
    image_path: string;
    imageUrl: string;
    is_favorite: number;
    created_at: string;
    resolution?: string;
}

interface ProjectDetail {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    generations: Generation[];
}

const MODEL_BADGES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    flash: { icon: <Zap className="w-3 h-3" />, label: "Flash", color: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
    pro: { icon: <Diamond className="w-3 h-3" />, label: "Nano Banana 2", color: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
    imagen: { icon: <Sparkles className="w-3 h-3" />, label: "Imagen 4", color: "text-blue-300 bg-blue-500/20 border-blue-500/30" },
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [confirmingRemovalId, setConfirmingRemovalId] = useState<string | null>(null);

    const fetchProject = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${id}`);
            if (res.ok) {
                const data = await res.json();
                setProject(data);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchProject(); }, [fetchProject]);

    const handleEdit = async () => {
        if (!editName.trim() || !project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || undefined }),
            });
            if (res.ok) {
                setEditing(false);
                fetchProject();
            }
        } catch { /* silent */ }
    };

    const handleRemoveFromProject = async (generationId: string) => {
        setConfirmingRemovalId(generationId);
    };

    const confirmRemoveFromProject = async () => {
        if (!project || !confirmingRemovalId) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/generations`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ generationId: confirmingRemovalId, action: "remove" }),
            });
            if (res.ok) {
                setProject((prev) =>
                    prev ? { ...prev, generations: prev.generations.filter((g) => g.id !== confirmingRemovalId) } : null
                );
                if (selectedImage?.id === confirmingRemovalId) setSelectedImage(null);
                setConfirmingRemovalId(null);
            }
        } catch { /* silent */ }
    };

    const handleToggleFavorite = async (genId: string) => {
        try {
            const res = await fetch("/api/favorites", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ generationId: genId }),
            });
            if (res.ok) {
                const data = await res.json();
                setProject((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        generations: prev.generations.map((g) =>
                            g.id === genId ? { ...g, is_favorite: data.is_favorite ? 1 : 0 } : g
                        ),
                    };
                });
                if (selectedImage?.id === genId) {
                    setSelectedImage((s) => s ? { ...s, is_favorite: data.is_favorite ? 1 : 0 } : null);
                }
            }
        } catch { /* silent */ }
    };

    const handleCopyPrompt = (prompt: string, genId: string) => {
        navigator.clipboard.writeText(prompt);
        setCopiedId(genId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Carregando projeto...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <FolderOpen className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">Projeto não encontrado</p>
                    <Link href="/projects" className="text-xs text-accent mt-2 hover:underline">
                        ← Voltar para projetos
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Link
                    href="/projects"
                    className="p-2 mt-0.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-glass-hover"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {editing ? (
                    <div className="flex-1 space-y-3">
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                            className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-focus"
                            autoFocus
                        />
                        <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Descrição..."
                            rows={2}
                            className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="px-3 py-1.5 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover"
                            >
                                <X className="w-3 h-3 inline mr-1" />Cancelar
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={!editName.trim()}
                                className="px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg"
                            >
                                <Check className="w-3 h-3 inline mr-1" />Salvar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-start justify-between">
                        <div>
                            <h1 className="font-display font-bold text-2xl text-text-primary flex items-center gap-3">
                                <FolderOpen className="w-6 h-6 text-accent" />
                                {project.name}
                            </h1>
                            {project.description && (
                                <p className="text-sm text-text-muted mt-1 ml-9">{project.description}</p>
                            )}
                            <div className="flex gap-3 items-center mt-2 ml-9">
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {project.generations.length} {project.generations.length === 1 ? "imagem" : "imagens"}
                                </span>
                                <span className="text-xs text-text-muted">
                                    Atualizado {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => { setEditing(true); setEditName(project.name); setEditDesc(project.description || ""); }}
                            className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-glass-hover"
                            title="Editar projeto"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Grid de Imagens */}
            {project.generations.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 glass-card"
                >
                    <ImageIcon className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">Nenhuma imagem neste projeto</p>
                    <p className="text-xs text-text-muted mt-1">
                        Gere imagens no Studio com este projeto ativo
                    </p>
                    <Link href="/studio" className="mt-4 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-xl transition-colors">
                        Ir para o Studio
                    </Link>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                        {project.generations.map((gen) => {
                            const badge = MODEL_BADGES[gen.model] || MODEL_BADGES.flash;
                            return (
                                <motion.div
                                    key={gen.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative glass-card overflow-hidden cursor-pointer"
                                    onClick={() => setSelectedImage(gen)}
                                >
                                    <div className="aspect-square bg-bg-glass relative overflow-hidden">
                                        <img
                                            src={gen.imageUrl}
                                            alt={gen.prompt}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {/* Badge do modelo */}
                                        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border ${badge.color}`}>
                                            {badge.icon} {badge.label}
                                        </div>

                                        {/* Favorito */}
                                        {gen.is_favorite === 1 && (
                                            <div className="absolute top-2 right-2">
                                                <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                                            </div>
                                        )}

                                        {/* Expand icon */}
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Maximize2 className="w-4 h-4 text-white/80" />
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <p className="text-[11px] text-text-muted line-clamp-2">{gen.prompt}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal Fullscreen da Imagem */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative max-w-4xl w-full mx-4 bg-bg-surface border border-border-default rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Imagem */}
                            <div className="flex-1 flex items-center justify-center bg-black/30 min-h-0 overflow-hidden p-4">
                                <img
                                    src={selectedImage.imageUrl}
                                    alt={selectedImage.prompt}
                                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                                />
                            </div>

                            {/* Info */}
                            <div className="p-5 border-t border-border-default space-y-3 shrink-0">
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    {selectedImage.prompt}
                                </p>

                                <div className="flex items-center gap-4 flex-wrap">
                                    {(() => {
                                        const b = MODEL_BADGES[selectedImage.model] || MODEL_BADGES.flash;
                                        return (
                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border ${b.color}`}>
                                                {b.icon} {b.label}
                                            </span>
                                        );
                                    })()}
                                    <span className="text-xs text-text-muted">
                                        {selectedImage.aspect_ratio || selectedImage.aspectRatio}
                                    </span>
                                    {selectedImage.resolution && (
                                        <span className="text-xs text-text-muted flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" /> {selectedImage.resolution}
                                        </span>
                                    )}
                                    <span className="text-xs text-text-muted">
                                        {new Date(selectedImage.created_at).toLocaleString("pt-BR")}
                                    </span>
                                </div>

                                <div className="flex gap-2 pt-2 flex-wrap">
                                    <button
                                        onClick={() => handleCopyPrompt(selectedImage.prompt, selectedImage.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        {copiedId === selectedImage.id ? "Copiado!" : "Copiar Prompt"}
                                    </button>

                                    <a
                                        href={selectedImage.imageUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download
                                    </a>

                                    <button
                                        onClick={() => handleToggleFavorite(selectedImage.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-colors ${selectedImage.is_favorite
                                            ? "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                                            : "text-text-secondary border-border-default hover:bg-bg-glass-hover"
                                            }`}
                                    >
                                        {selectedImage.is_favorite ? (
                                            <><HeartOff className="w-3.5 h-3.5" /> Desfavoritar</>
                                        ) : (
                                            <><Heart className="w-3.5 h-3.5" /> Favoritar</>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleRemoveFromProject(selectedImage.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs text-orange-400 border border-orange-500/30 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-colors"
                                    >
                                        <FolderMinus className="w-3.5 h-3.5" />
                                        Remover do Projeto
                                    </button>
                                </div>
                            </div>

                            {/* Close */}
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-3 right-3 p-2 text-text-muted hover:text-text-primary bg-bg-surface/80 backdrop-blur-sm rounded-full border border-border-default hover:bg-bg-glass-hover transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Confirmação para Remover do Projeto */}
            <AnimatePresence>
                {confirmingRemovalId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setConfirmingRemovalId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-bg-surface border border-border-default rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="p-3 bg-orange-500/10 rounded-full text-orange-400 mb-2">
                                    <FolderMinus className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary">Remover do Projeto?</h3>
                                <p className="text-sm text-text-secondary">
                                    A imagem será removida deste projeto, mas continuará existindo no seu histórico geral.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmingRemovalId(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmRemoveFromProject}
                                    className="flex-1 py-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-colors font-medium text-sm"
                                >
                                    Remover
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
