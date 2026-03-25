"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ExternalLink, ImageIcon, Check, Trash2 } from "lucide-react";
import { localImageLoader } from "@/lib/image-loader";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { ImageDetailModal, type GenerationDetail } from "@/components/ImageDetailModal";

interface Generation {
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

/** Normalize DB path (which may use backslashes or storage/ prefix) into /api/images/... */
function toImageUrl(image_path: string): string {
    const normalized = image_path.replace(/\\/g, "/");
    if (normalized.startsWith("/api/images/")) return normalized;
    return `/api/images/${normalized.replace(/^storage\//, "")}`;
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
            model: gen.model as any,
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
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 md:grid md:mx-0 md:px-0 md:overflow-x-visible md:snap-none md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {generations.map((gen, index) => {
                    const isLast = index === generations.length - 1;
                    const imageUrl = toImageUrl(gen.image_path);

                    return (
                        <motion.div
                            key={gen.id}
                            ref={isLast ? lastElementRef : null}
                            whileHover={{ y: -3, scale: selectedIds.has(gen.id) ? 0.98 : 1.02 }}
                            transition={{ duration: 0.15 }}
                            onPointerDown={(e) => handlePointerDown(gen.id, e)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onClick={() => {
                                if (selectionMode) return;
                                setSelectedGen(gen);
                            }}
                            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-bg-glass border shadow-sm transition-all snap-center shrink-0 w-[80vw] max-w-xs md:w-auto md:max-w-none md:shrink
                                ${selectedIds.has(gen.id)
                                    ? "border-accent scale-[0.98] ring-4 ring-accent/20 shadow-lg shadow-accent/10"
                                    : "border-border-default hover:shadow-lg hover:border-accent/30"
                                }`}
                        >
                            {/* Thumbnail via custom loader — sharp compresses to WebP on first load */}
                            <Image
                                loader={localImageLoader}
                                src={imageUrl}
                                alt={gen.prompt.slice(0, 40)}
                                fill
                                sizes="(max-width: 768px) 80vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                                className={`object-cover transition-transform duration-300 ${selectionMode && !selectedIds.has(gen.id) ? "opacity-60 grayscale-[50%]" : "group-hover:scale-105"
                                    }`}
                                priority={index < 6}
                            />

                            {/* Hover overlay with prompt */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <p className="text-[10px] text-white/90 line-clamp-2 leading-relaxed">
                                    {gen.prompt}
                                </p>
                            </div>

                            {/* Open icon */}
                            {!selectionMode && (
                                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <ExternalLink className="w-3 h-3" />
                                </div>
                            )}

                            {/* Selected Indicator Overlay */}
                            {selectedIds.has(gen.id) && (
                                <div className="absolute top-2 left-2 p-1.5 rounded-full bg-accent text-white shadow-xl ring-2 ring-white/20 animate-in zoom-in-50 duration-200">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                            )}

                            {/* Hover overlay for selection mode (if not selected) */}
                            {selectionMode && !selectedIds.has(gen.id) && (
                                <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 border border-white/50 text-white/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <div className="w-3.5 h-3.5 rounded-full" />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

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
            <AnimatePresence>
                {selectionMode && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-bg-surface border border-border-default rounded-full shadow-2xl px-4 py-3 flex items-center gap-4 min-w-[320px] max-w-[90vw] overflow-hidden justify-between backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-xs">
                                {selectedIds.size}
                            </span>
                            <span className="text-sm font-medium text-text-primary">
                                Selecionad{selectedIds.size === 1 ? 'o' : 'os'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCancelSelection}
                                disabled={isBatchDeleting}
                                className="px-4 py-2 rounded-full text-xs font-medium text-text-secondary hover:bg-bg-glass-hover transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                disabled={selectedIds.size === 0 || isBatchDeleting}
                                className="px-4 py-2 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isBatchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Excluir
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            currentIndex={currentIndex}
                            totalImages={totalImages}
                            onNext={onNext}
                            onPrevious={onPrevious}
                        />
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}
