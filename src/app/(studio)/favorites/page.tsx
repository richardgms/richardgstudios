"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap, Diamond, Sparkles, Loader2, Copy, Check, X, Download, Ratio, AlertTriangle, Ban, ImageIcon, BrainCircuit } from "lucide-react";
import { localImageLoader } from "@/lib/image-loader";
import { AttachmentLightbox } from "@/components/AttachmentLightbox";

interface FavoriteItem {
    id: string;
    prompt: string;
    model: string;
    aspectRatio: string;
    resolution?: string;
    imageUrl: string;
    isFavorite: boolean;
    createdAt: string;
    attachments?: string;
    metadata?: string;
}

import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";



const MODEL_BADGES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    flash: { icon: <Zap className="w-3 h-3" />, label: "Flash", color: "text-amber-300 bg-amber-500/20 border-amber-500/30" },
    pro: { icon: <Diamond className="w-3 h-3" />, label: "Nano Banana 2", color: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
    imagen: { icon: <Sparkles className="w-3 h-3" />, label: "Imagen 4", color: "text-blue-300 bg-blue-500/20 border-blue-500/30" },
};

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<FavoriteItem | null>(null);
    const [confirmingUnfavoriteId, setConfirmingUnfavoriteId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const restoreSession = useAppStore(s => s.restoreSession);
    const router = useRouter();

    const handleUseAsBase = (item: FavoriteItem) => {
        restoreSession({
            prompt: item.prompt,
            model: item.model as any,
            aspectRatio: item.aspectRatio,
            attachments: item.attachments ? JSON.parse(item.attachments) : [],
            metadata: item.metadata
        });
        setSelectedImage(null);
        router.push("/studio");
    };

    const fetchFavorites = useCallback(async () => {
        try {
            const res = await fetch("/api/favorites");
            if (res.ok) {
                const data = await res.json();
                setFavorites(data.favorites);
            }
        } catch (err) {
            console.error("Erro ao carregar favoritos:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const confirmUnfavorite = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setConfirmingUnfavoriteId(id);
    };

    const handleUnfavorite = async () => {
        if (!confirmingUnfavoriteId) return;
        setIsProcessing(true);
        try {
            // User requested that removing from favorites sends to trash
            const res = await fetch(`/api/generations/${confirmingUnfavoriteId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setFavorites((prev) => prev.filter((f) => f.id !== confirmingUnfavoriteId));
                if (selectedImage?.id === confirmingUnfavoriteId) {
                    setSelectedImage(null);
                }
            }
        } catch (err) {
            console.error("Erro ao mover para lixeira:", err);
        } finally {
            setIsProcessing(false);
            setConfirmingUnfavoriteId(null);
        }
    };

    const handleCopyPrompt = (id: string, prompt: string) => {
        navigator.clipboard.writeText(prompt);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <h1 className="font-display font-bold text-2xl text-text-primary mb-6">
                    Favoritos
                </h1>
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Carregando favoritos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl text-text-primary">
                    Favoritos
                </h1>
                {favorites.length > 0 && (
                    <span className="text-xs text-text-muted bg-bg-glass border border-border-default px-3 py-1.5 rounded-full">
                        {favorites.length} {favorites.length === 1 ? "imagem" : "imagens"}
                    </span>
                )}
            </div>

            {favorites.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 glass-card"
                >
                    <Star className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">
                        Nenhum favorito ainda
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                        Gere uma imagem no Studio e clique na ⭐ para salvar aqui
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {favorites.map((fav) => {
                            const badge = MODEL_BADGES[fav.model] || MODEL_BADGES.flash;
                            return (
                                <motion.div
                                    key={fav.id}
                                    layoutId={`fav-${fav.id}`}
                                    onClick={() => setSelectedImage(fav)}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="glass-card overflow-hidden group cursor-pointer"
                                >
                                    {/* Imagem */}
                                    <div className="relative aspect-square">
                                        <Image
                                            loader={localImageLoader}
                                            src={fav.imageUrl}
                                            alt={fav.prompt.slice(0, 60)}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            className="object-cover"
                                        />
                                        {/* Overlay com ações */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <button
                                            onClick={(e) => confirmUnfavorite(fav.id, e)}
                                            className="absolute top-2 right-2 p-2 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/30 hover:text-red-300 hover:border-red-500/40"
                                            title="Remover dos favoritos"
                                        >
                                            <Star className="w-4 h-4 fill-current" />
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 space-y-2">
                                        {/* Prompt */}
                                        <div className="flex items-start gap-2">
                                            <p className="text-xs text-text-secondary line-clamp-2 flex-1 leading-relaxed">
                                                {fav.prompt}
                                            </p>
                                            <button
                                                onClick={() => handleCopyPrompt(fav.id, fav.prompt)}
                                                className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
                                                title="Copiar prompt"
                                            >
                                                {copiedId === fav.id ? (
                                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badge.color}`}>
                                                {badge.icon}
                                                {badge.label}
                                            </span>
                                            <span className="text-[10px] text-text-muted">
                                                {new Date(fav.createdAt).toLocaleDateString("pt-BR")}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <ImageDetailModal
                        item={selectedImage}
                        onClose={() => setSelectedImage(null)}
                        copiedId={copiedId}
                        onCopyPrompt={handleCopyPrompt}
                        onUnfavorite={confirmUnfavorite}
                        isProcessing={isProcessing}
                        setLightboxUrl={setLightboxUrl}
                        onUseAsBase={handleUseAsBase}
                    />
                )}
            </AnimatePresence>

            {/* Modal de Confirmação */}
            <AnimatePresence>
                {confirmingUnfavoriteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => !isProcessing && setConfirmingUnfavoriteId(null)}
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
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary">Mover para a Lixeira?</h3>
                                <p className="text-sm text-text-secondary">
                                    O item será removido dos favoritos e enviado para a lixeira.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmingUnfavoriteId(null)}
                                    disabled={isProcessing}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUnfavorite}
                                    disabled={isProcessing}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lixeira"}
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

function ImageDetailModal({ item, onClose, copiedId, onCopyPrompt, onUnfavorite, isProcessing, setLightboxUrl, onUseAsBase }: {
    item: FavoriteItem,
    onClose: () => void,
    copiedId: string | null,
    onCopyPrompt: (id: string, prompt: string) => void,
    onUnfavorite: (id: string) => void,
    isProcessing: boolean,
    setLightboxUrl: (url: string) => void,
    onUseAsBase: (item: FavoriteItem) => void
}) {
    const attachments: string[] = item.attachments ? JSON.parse(item.attachments) : [];

    let thinkingLevel = null;
    try {
        if (item.metadata) {
            thinkingLevel = JSON.parse(item.metadata).thinkingLevel;
        }
    } catch (e) { }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                layoutId={`fav-${item.id}`}
                className="relative max-w-5xl w-full max-h-[90vh] bg-bg-surface border border-border-default rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors backdrop-blur-md"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Imagem */}
                <div className="flex-1 bg-black/50 flex items-center justify-center p-4 min-h-[40vh]">
                    <img
                        src={item.imageUrl}
                        alt={item.prompt}
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                    />
                </div>

                {/* Detalhes */}
                <div className="w-full md:w-96 bg-bg-surface border-l border-border-default flex flex-col">
                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Prompt</h3>
                                <div className="p-4 bg-bg-glass rounded-xl border border-border-default relative group">
                                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                                        {item.prompt}
                                    </p>
                                    <button
                                        onClick={() => onCopyPrompt(item.id, item.prompt)}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-bg-surface border border-border-default text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                                        title="Copiar prompt"
                                    >
                                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {attachments.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Referências</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {attachments.map((url, i) => (
                                            <motion.button
                                                key={`${item.id}-att-${i}`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setLightboxUrl(url)}
                                                className="relative w-14 h-14 rounded-lg overflow-hidden border border-border-default hover:border-accent/40 transition-all"
                                            >
                                                <Image
                                                    loader={localImageLoader}
                                                    src={url}
                                                    alt="Ref"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Modelo</h3>
                                    <p className="text-sm text-text-secondary capitalize">{item.model === 'pro' ? 'Nano Banana 2' : item.model}</p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Proporção</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                                        <Ratio className="w-3.5 h-3.5 text-text-muted" />
                                        {item.aspectRatio || "1:1"}
                                    </div>
                                </div>
                                {item.resolution && (
                                    <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Resolução</h3>
                                        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                                            <ImageIcon className="w-3.5 h-3.5 text-text-muted" />
                                            {item.resolution}
                                        </div>
                                    </div>
                                )}
                                {thinkingLevel && (item.model === 'pro' || item.model === 'nb-pro') && (
                                    <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Thinking Level</h3>
                                        <div className="flex items-center gap-1.5 text-sm text-text-secondary capitalize">
                                            <BrainCircuit className="w-3.5 h-3.5 text-accent" />
                                            {thinkingLevel.toLowerCase()}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Data</h3>
                                    <p className="text-sm text-text-secondary">
                                        {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border-default bg-bg-glass/50 gap-3 flex flex-col">
                        <button
                            onClick={() => onUseAsBase(item)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                        >
                            <Sparkles className="w-4 h-4" />
                            Usar como Base
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onUnfavorite(item.id)}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 group/fav"
                            >
                                <span className="group-hover/fav:hidden flex items-center gap-2"><Star className="w-4 h-4 fill-amber-400" /> Favoritado</span>
                                <span className="hidden group-hover/fav:flex items-center gap-2"><Ban className="w-4 h-4" /> Desfavoritar</span>
                            </button>
                            <a
                                href={item.imageUrl}
                                download={`nano-banana-${item.id}.png`}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium bg-bg-glass text-text-secondary border border-border-default hover:bg-bg-glass-hover hover:text-text-primary transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Baixar
                            </a>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
