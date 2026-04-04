"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Star, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { ImageDetailModal, type GenerationDetail } from "@/components/ImageDetailModal";

// Novos Componentes
import { GalleryItem } from "@/components/gallery/GalleryItem";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GallerySelectionBar } from "@/components/gallery/GallerySelectionBar";

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

type FavoriteModelId = "flash" | "pro" | "imagen" | "veo-3.1" | "veo-3.1-fast";

/** Adapta o tipo FavoriteItem para o tipo canônico GenerationDetail */
function toDetail(item: FavoriteItem): GenerationDetail {
    return {
        id: item.id,
        prompt: item.prompt,
        model: item.model,
        imageUrl: item.imageUrl,
        aspectRatio: item.aspectRatio,
        resolution: item.resolution,
        mediaType: "image", // Favoritos atuais são predominantemente imagens
        created_at: item.createdAt,
        attachments: item.attachments ? JSON.parse(item.attachments) : [],
        metadata: item.metadata,
        isFavorite: item.isFavorite,
    };
}

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<FavoriteItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Multi-select state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const restoreSession = useAppStore(s => s.restoreSession);
    const router = useRouter();

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

    const handleUseAsBase = (item: GenerationDetail) => {
        restoreSession({
            prompt: item.prompt,
            model: item.model as FavoriteModelId,
            aspectRatio: item.aspectRatio ?? "1:1",
            attachments: item.attachments ?? [],
            metadata: item.metadata
        });
        setSelectedImage(null);
        router.push("/studio");
    };

    const handleToggleFavorite = async (genId: string, currentState: boolean) => {
        // Em Favoritos, desfavoritar geralmente significa remover da lista (ou mover para lixeira conforme regra do usuário)
        if (!currentState) {
            // Se estava favoritado e agora não está (foi clicado na estrela preenchida)
            await handleDelete(genId);
        }
    };

    const handleDelete = async (genId: string) => {
        try {
            const res = await fetch(`/api/generations/${genId}`, { method: "DELETE" });
            if (res.ok) {
                setFavorites(prev => prev.filter(f => f.id !== genId));
                if (selectedImage?.id === genId) setSelectedImage(null);
            }
        } catch (err) {
            console.error("Erro ao deletar:", err);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        if (!window.confirm(`Mover ${count} favorito${count > 1 ? 's' : ''} para a lixeira?`)) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/generations/batch-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });

            if (res.ok) {
                setFavorites(prev => prev.filter(f => !selectedIds.has(f.id)));
                handleCancelSelection();
            }
        } catch (err) {
            console.error("Erro no delete em lote:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                if (next.size === 0) setSelectionMode(false);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCancelSelection = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <h1 className="font-display font-bold text-2xl text-text-primary mb-6">Favoritos</h1>
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
                <h1 className="font-display font-bold text-2xl text-text-primary">Favoritos</h1>
                {favorites.length > 0 && (
                    <span className="text-xs text-text-muted bg-bg-glass border border-border-default px-3 py-1.5 rounded-full">
                        {favorites.length} {favorites.length === 1 ? "imagem" : "imagens"}
                    </span>
                )}
            </div>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Star className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">Nenhum favorito ainda</p>
                    <p className="text-xs text-text-muted mt-1">Gere uma imagem no Studio e salve para aparecer aqui.</p>
                </div>
            ) : (
                <GalleryGrid>
                    {favorites.map((fav, index) => (
                        <GalleryItem
                            key={fav.id}
                            id={fav.id}
                            index={index}
                            imageUrl={fav.imageUrl}
                            prompt={fav.prompt}
                            isSelected={selectedIds.has(fav.id)}
                            isSelectionMode={selectionMode}
                            onSelect={toggleSelection}
                            onClick={() => setSelectedImage(fav)}
                            onPointerDown={(id) => {
                                if (selectionMode) {
                                    toggleSelection(id);
                                } else {
                                    // Simplesmente ativa modo se for long press
                                    const t = setTimeout(() => {
                                        setSelectionMode(true);
                                        setSelectedIds(new Set([id]));
                                    }, 600);
                                    longPressTimerRef.current = t;
                                }
                            }}
                            onPointerUp={() => {
                                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                            }}
                            onPointerLeave={() => {
                                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                            }}
                        />
                    ))}
                </GalleryGrid>
            )}

            <GallerySelectionBar
                isVisible={selectionMode}
                selectedCount={selectedIds.size}
                isProcessing={isProcessing}
                onCancel={handleCancelSelection}
                onDelete={handleBatchDelete}
            />

            <AnimatePresence>
                {selectedImage && (() => {
                    const currentIndex = favorites.findIndex(f => f.id === selectedImage.id);
                    return (
                        <ImageDetailModal
                            gen={toDetail(selectedImage)}
                            onClose={() => setSelectedImage(null)}
                            onUseAsBase={handleUseAsBase}
                            onToggleFavorite={handleToggleFavorite}
                            onDelete={handleDelete}
                            onNext={currentIndex < favorites.length - 1 ? () => setSelectedImage(favorites[currentIndex + 1]) : undefined}
                            onPrevious={currentIndex > 0 ? () => setSelectedImage(favorites[currentIndex - 1]) : undefined}
                            requireUnfavoriteConfirmation
                        />
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}
