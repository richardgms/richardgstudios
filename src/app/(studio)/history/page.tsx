"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Loader2, ImageIcon, Zap, Diamond, Sparkles, MessageSquare, X, Copy, Ratio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { localImageLoader } from "@/lib/image-loader";
import { AttachmentLightbox } from "@/components/AttachmentLightbox";

interface SessionItem {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    image_count: number;
}

interface SessionDetail {
    id: string;
    name: string;
    created_at: string;
    generations: Array<{
        id: string;
        prompt: string;
        model: string;
        imageUrl: string;
        created_at: string;
        resolution?: string;
        aspectRatio: string;
        attachments?: string;
    }>;
}



const MODEL_BADGES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    flash: { icon: <Zap className="w-3 h-3" />, label: "Flash", color: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
    pro: { icon: <Diamond className="w-3 h-3" />, label: "Nano Banana 2", color: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
    imagen: { icon: <Sparkles className="w-3 h-3" />, label: "Imagen", color: "text-blue-300 bg-blue-500/20 border-blue-500/30" },
};

export default function HistoryPage() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedData, setExpandedData] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const router = useRouter();
    const { setActiveSession } = useAppStore();

    const handleOpenInStudio = (session: SessionItem) => {
        setActiveSession(session.id, session.name);
        router.push("/studio");
    };

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const handleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            setExpandedData(null);
            return;
        }
        setExpandedId(id);
        try {
            const res = await fetch(`/api/sessions/${id}`);
            if (res.ok) {
                const data = await res.json();
                setExpandedData(data);
            }
        } catch { /* silent */ }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            const res = await fetch(`/api/sessions/${deletingId}`, { method: "DELETE" });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.id !== deletingId));
                if (expandedId === deletingId) {
                    setExpandedId(null);
                    setExpandedData(null);
                }
                setDeletingId(null);
            }
        } catch { /* silent */ }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <h1 className="font-display font-bold text-2xl text-text-primary mb-6">Histórico</h1>
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Carregando sessões...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl text-text-primary">Histórico</h1>
                {sessions.length > 0 && (
                    <span className="text-xs text-text-muted bg-bg-glass border border-border-default px-3 py-1.5 rounded-full">
                        {sessions.length} {sessions.length === 1 ? "sessão" : "sessões"}
                    </span>
                )}
            </div>

            {sessions.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 glass-card"
                >
                    <History className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">Nenhuma sessão ainda</p>
                    <p className="text-xs text-text-muted mt-1">
                        Crie uma sessão no Studio para agrupar suas gerações
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="glass-card overflow-hidden"
                        >
                            {/* Header */}
                            <div
                                onClick={() => handleExpand(session.id)}
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-glass-hover transition-colors"
                            >
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-text-primary">{session.name}</h3>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {session.image_count} {session.image_count === 1 ? "imagem" : "imagens"} · {new Date(session.updated_at).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenInStudio(session); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-light hover:bg-accent/10 transition-colors rounded-lg border border-accent/20"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Abrir chat no studio
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                                        className="p-2 text-text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                        title="Excluir sessão"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence initial={false}>
                                {expandedId === session.id && (
                                    <motion.div
                                        key="content"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="overflow-hidden border-t border-border-default"
                                    >
                                        <div className="p-4">
                                            {!expandedData ? (
                                                <div className="flex justify-center py-4">
                                                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                                                </div>
                                            ) : expandedData.generations.length === 0 ? (
                                                <p className="text-xs text-text-muted text-center py-4">Sessão vazia</p>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {expandedData.generations.map((gen) => {
                                                        const badge = MODEL_BADGES[gen.model] || MODEL_BADGES.flash;
                                                        const atts: string[] = gen.attachments ? JSON.parse(gen.attachments) : [];

                                                        return (
                                                            <div key={gen.id} className="p-4 bg-bg-glass border border-border-default rounded-xl space-y-3">
                                                                <div className="flex gap-4">
                                                                    <div className="w-32 h-32 aspect-square rounded-lg overflow-hidden border border-border-default shrink-0 cursor-pointer" onClick={() => {
                                                                        // Future: open gallery-style modal for this gen
                                                                    }}>
                                                                        <Image
                                                                            loader={localImageLoader}
                                                                            src={gen.imageUrl}
                                                                            alt={gen.prompt.slice(0, 40)}
                                                                            width={128}
                                                                            height={128}
                                                                            className="object-cover"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badge.color}`}>
                                                                                {badge.icon}
                                                                                {badge.label}
                                                                            </span>
                                                                            <span className="text-[10px] text-text-muted">
                                                                                {new Date(gen.created_at).toLocaleString("pt-BR")}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed bg-black/20 p-2 rounded-lg italic">
                                                                            "{gen.prompt}"
                                                                        </p>

                                                                        {atts.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                <p className="text-[10px] font-bold text-text-muted uppercase">Referências</p>
                                                                                <div className="flex gap-1.5">
                                                                                    {atts.map((url, i) => (
                                                                                        <button
                                                                                            key={`${gen.id}-att-${i}`}
                                                                                            onClick={() => setLightboxUrl(url)}
                                                                                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-border-default hover:border-accent/40 transition-all"
                                                                                        >
                                                                                            <Image
                                                                                                loader={localImageLoader}
                                                                                                src={url}
                                                                                                alt="Ref"
                                                                                                fill
                                                                                                className="object-cover"
                                                                                            />
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
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
                                <h3 className="font-bold text-lg text-text-primary">Excluir Sessão?</h3>
                                <p className="text-sm text-text-secondary">
                                    A sessão e todas as imagens geradas nela serão excluídas permanentemente.
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
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium text-sm"
                                >
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {lightboxUrl && (
                <AttachmentLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
            )}
        </div>
    );
}
