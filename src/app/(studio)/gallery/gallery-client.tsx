"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, ImageIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toImageUrl } from "@/lib/image-url";
import { useRouter } from "next/navigation";
import { type ModelId } from "@/lib/model-config";
import { ImageDetailModal, type GenerationDetail } from "@/components/ImageDetailModal";

// Novos Componentes
import { GalleryItem } from "@/components/gallery/GalleryItem";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GallerySelectionBar } from "@/components/gallery/GallerySelectionBar";

export interface Generation {
    id: string;
    prompt: string;
    model: string;
    aspect_ratio: string;
    resolution?: string;
    image_path: string;
    is_favorite: number;
    created_at: string;
    media_type: "image" | "video";
    status: "completed" | "processing" | "failed";
    attachments?: string; // JSON array of URLs
    metadata?: string; // JSON string with canvas state
}

interface GalleryClientProps {
    initialGenerations: Generation[];
}

/** Adapta o tipo Generation (galeria) para o tipo canônico GenerationDetail */
function toDetail(gen: Generation): GenerationDetail {
    return {
        id: gen.id,
        prompt: gen.prompt,
        model: gen.model,
        imageUrl: toImageUrl(gen.image_path),
        aspectRatio: gen.aspect_ratio,
        resolution: gen.resolution,
        mediaType: gen.media_type,
        created_at: gen.created_at,
        attachments: gen.attachments ? JSON.parse(gen.attachments) : [],
        metadata: gen.metadata,
        isFavorite: !!gen.is_favorite,
    };
}

export function GalleryClient({ initialGenerations }: GalleryClientProps) {
    const restoreSession = useAppStore(s => s.restoreSession);
    const router = useRouter();
    const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialGenerations.length === 50);
    const [selectedGen, setSelectedGen] = useState<Generation | null>(null);

    // Multi-select state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleUseAsBase = (gen: GenerationDetail) => {
        restoreSession({
            prompt: gen.prompt,
            model: gen.model as ModelId,
            aspectRatio: gen.aspectRatio ?? "1:1",
            attachments: gen.attachments ?? [],
            metadata: gen.metadata
        });
        setSelectedGen(null);
        router.push("/studio");
    };

    const handleToggleFavorite = async (genId: string, currentState: boolean) => {
        try {
            const res = await fetch(`/api/generations/${genId}/favorite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_favorite: !currentState }),
            });

            if (res.ok) {
                setGenerations(prev =>
                    prev.map(g => (g.id === genId ? { ...g, is_favorite: !currentState ? 1 : 0 } : g))
                );
            }
        } catch (error) {
            console.error("Erro ao favoritar:", error);
        }
    };

    // ── Multi-select Logic ──
    const handlePointerDown = (id: string, e: React.PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;

        if (selectionMode) {
            toggleSelection(id);
        } else {
            longPressTimeoutRef.current = setTimeout(() => {
                setSelectionMode(true);
                setSelectedIds(new Set([id]));
                if (window.navigator?.vibrate) {
                    window.navigator.vibrate(50);
                }
            }, 600);
        }
    };

    const handlePointerUp = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const handlePointerLeave = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
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

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        if (!window.confirm(`Tem certeza que deseja mover ${count} imagem${count > 1 ? 'ns' : ''} para a lixeira?`)) return;

        setIsBatchDeleting(true);
        try {
            const res = await fetch("/api/generations/batch-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });

            if (res.ok) {
                setGenerations(prev => prev.filter(img => !selectedIds.has(img.id)));
                handleCancelSelection();
            } else {
                console.error("Failed to batch delete");
            }
        } catch (error) {
            console.error("Error during batch delete:", error);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const observer = useRef<IntersectionObserver | null>(null);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const res = await fetch(`/api/generations?limit=50&offset=${page * 50}`);
            if (res.ok) {
                const data = await res.json();
                if (data.generations.length > 0) {
                    setGenerations(prev => [...prev, ...data.generations]);
                    setPage(p => p + 1);
                }
                if (data.generations.length < 50) setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to load more generations", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [hasMore, isLoadingMore, page]);

    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) loadMore();
        });
        if (node) observer.current.observe(node);
    }, [isLoadingMore, hasMore, loadMore]);

    // Close modal on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedGen(null); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    if (generations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 glass-card">
                <ImageIcon className="w-12 h-12 text-text-muted/30 mb-3" />
                <p className="text-sm text-text-secondary">Nenhuma imagem gerada ainda</p>
                <p className="text-xs text-text-muted mt-1">Suas criações no Studio aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <GalleryGrid>
                {generations.map((gen, index) => {
                    const isLast = index === generations.length - 1;
                    const imageUrl = toImageUrl(gen.image_path);

                    return (
                        <div key={gen.id} ref={isLast ? lastElementRef : null}>
                            <GalleryItem
                                id={gen.id}
                                index={index}
                                imageUrl={imageUrl}
                                prompt={gen.prompt}
                                mediaType={gen.media_type}
                                isSelected={selectedIds.has(gen.id)}
                                isSelectionMode={selectionMode}
                                onSelect={toggleSelection}
                                onClick={() => setSelectedGen(gen)}
                                onPointerDown={handlePointerDown}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerLeave}
                                priority={index < 6}
                            />
                        </div>
                    );
                })}
            </GalleryGrid>

            {isLoadingMore && (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
            )}

            {!hasMore && generations.length > 0 && (
                <p className="text-center text-xs text-text-muted py-4">
                    {generations.length} imagens carregadas
                </p>
            )}

            {/* Floating Action Bar for Batch Selection */}
            <GallerySelectionBar
                isVisible={selectionMode}
                selectedCount={selectedIds.size}
                isProcessing={isBatchDeleting}
                onCancel={handleCancelSelection}
                onDelete={handleBatchDelete}
            />

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedGen && (() => {
                    const currentIndex = generations.findIndex((img) => img.id === selectedGen.id);
                    const totalImages = generations.length;
                    const onNext = currentIndex < totalImages - 1 ? () => setSelectedGen(generations[currentIndex + 1]) : undefined;
                    const onPrevious = currentIndex > 0 ? () => setSelectedGen(generations[currentIndex - 1]) : undefined;

                    return (
                        <ImageDetailModal
                            key="detail-modal"
                            gen={toDetail(selectedGen)}
                            onClose={() => setSelectedGen(null)}
                            onUseAsBase={handleUseAsBase}
                            onToggleFavorite={handleToggleFavorite}
                            onDelete={async (genId) => {
                                const res = await fetch(`/api/generations/${genId}`, { method: "DELETE" });
                                if (res.ok) {
                                    setGenerations(prev => prev.filter(img => img.id !== genId));
                                } else {
                                    throw new Error("Failed to delete");
                                }
                            }}
                            requireUnfavoriteConfirmation
                            onNext={onNext}
                            onPrevious={onPrevious}
                        />
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}
