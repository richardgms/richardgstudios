"use client";

import Image from "next/image";
import React, { useRef, useState, useCallback, useEffect, useContext, createContext } from "react";
import { useAppStore } from "@/lib/store";
import { compressImage } from "@/lib/image-utils";
import { Plus, X, Loader2, Tag, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { BrandAssetPickerModal } from "@/components/studio/BrandAssetPickerModal";

// Shared brands check — fetched once at grid level, shared across all slots
const HasBrandsContext = createContext<boolean | null>(null);

function getSlotLabel(index: number, videoMode: boolean): string {
    if (videoMode) {
        return index === 1 ? "1º Frame" : "Último Frame";
    }
    return `Referência ${index}`;
}

// ── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
    x: number;
    y: number;
    slotIndex: number;
}

interface SlotContextMenuProps {
    state: ContextMenuState;
    hasImage: boolean;
    hasBrands: boolean | null; // null = loading
    onInsertBrandAsset: () => void;
    onClearSlot: () => void;
    onClose: () => void;
}

function SlotContextMenu({ state, hasImage, hasBrands, onInsertBrandAsset, onClearSlot, onClose }: SlotContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Clamp position to viewport
    const MENU_W = 200;
    const MENU_H = hasImage ? 90 : 48;
    const x = state.x + MENU_W > window.innerWidth ? state.x - MENU_W : state.x;
    const y = state.y + MENU_H > window.innerHeight ? state.y - MENU_H : state.y;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("mousedown", handler);
        document.addEventListener("keydown", keyHandler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", keyHandler);
        };
    }, [onClose]);

    return createPortal(
        <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.08 }}
            style={{ position: "fixed", top: y, left: x, zIndex: 999 }}
            className="glass-card py-1 w-48 shadow-2xl"
        >
            {hasBrands === false ? (
                <div className="group relative">
                    <button
                        disabled
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted cursor-not-allowed text-left"
                    >
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        Inserir asset de marca
                    </button>
                    <span className="pointer-events-none absolute left-full top-0 ml-2 hidden group-hover:block w-44 rounded-lg bg-bg-surface border border-border-default p-2 text-xs text-text-secondary shadow-lg z-50">
                        Nenhuma marca cadastrada.{" "}
                        <a href="/brands" className="text-accent hover:underline">Criar marca →</a>
                    </span>
                </div>
            ) : (
                <button
                    onClick={() => { onClose(); onInsertBrandAsset(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-colors text-left"
                >
                    <Tag className="w-3.5 h-3.5 shrink-0 text-accent" />
                    Inserir asset de marca
                </button>
            )}

            {hasImage && (
                <>
                    <div className="border-t border-border-default my-0.5" />
                    <button
                        onClick={() => { onClose(); onClearSlot(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors text-left"
                    >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        Limpar slot
                    </button>
                </>
            )}
        </motion.div>,
        document.body
    );
}

// ── ImageSlot ────────────────────────────────────────────────────────────────

interface ImageSlotProps {
    index: number;
    videoMode: boolean;
    onNeedBrandsCheck: () => void;
}

const LONG_PRESS_DELAY = 350;
const LONG_PRESS_MOVE_THRESHOLD = 8;

function ImageSlot({ index, videoMode, onNeedBrandsCheck }: ImageSlotProps) {
    const { attachments, setSlot, unsetSlot } = useAppStore();
    const hasBrands = useContext(HasBrandsContext);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [showAssetPicker, setShowAssetPicker] = useState(false);

    // Long press state
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const base64 = attachments[index] || null;
    const label = getSlotLabel(index, videoMode);

    const openContextMenu = useCallback((x: number, y: number) => {
        setContextMenu({ x, y, slotIndex: index });
        onNeedBrandsCheck();
    }, [index, onNeedBrandsCheck]);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    // ── Right-click ──
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY);
    }, [openContextMenu]);

    // ── Long press (mobile) ──
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        longPressTimer.current = setTimeout(() => {
            const pos = touchStartPos.current;
            if (pos) openContextMenu(pos.x, pos.y);
        }, LONG_PRESS_DELAY);
    }, [openContextMenu]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!longPressTimer.current || !touchStartPos.current) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPos.current.x;
        const dy = touch.clientY - touchStartPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // Cleanup timer on unmount
    useEffect(() => () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    // ── File upload ──
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
        const MAX_FILE_SIZE = 10 * 1024 * 1024;

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            setError("Formato inválido (JPEG, PNG, WEBP).");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError("Arquivo muito grande (Máx 10MB).");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            setIsLoading(true);
            const compressedBase64 = await compressImage(file, 1024, 0.7);
            setSlot(index, compressedBase64);
        } catch (err) {
            console.error("Compression error", err);
            setError("Erro ao processar imagem.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        unsetSlot(index);
        setError(null);
    };

    const handleSlotClick = () => {
        if (!base64 && !isLoading) fileInputRef.current?.click();
    };

    return (
        <>
            <div className="relative flex flex-col gap-1 w-24">
                <div
                    className={`relative group w-24 h-24 rounded-xl overflow-hidden shadow-sm transition-all select-none
                        ${base64
                            ? "border border-border-default bg-black/20"
                            : "border-2 border-dashed border-border-default hover:border-accent hover:bg-accent/5 cursor-pointer bg-bg-glass"
                        }`}
                    onClick={handleSlotClick}
                    onContextMenu={handleContextMenu}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-black/50"
                            >
                                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                            </motion.div>
                        ) : base64 ? (
                            <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative w-full h-full">
                                <Image
                                    src={base64}
                                    alt={`Slot ${index}`}
                                    fill
                                    unoptimized
                                    sizes="96px"
                                    className="object-cover"
                                />
                                <button
                                    onClick={handleRemove}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/90 z-10"
                                    title="Remover"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-text-muted group-hover:text-accent transition-colors">
                                <Plus className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-medium">{index}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                </div>

                <div className="text-center w-full">
                    {error ? (
                        <span className="text-[9px] text-red-400 leading-tight block" title={error}>{error}</span>
                    ) : (
                        <span className="text-[10px] text-text-muted truncate max-w-full block" title={label}>{label}</span>
                    )}
                </div>
            </div>

            {/* Context menu (portal) */}
            <AnimatePresence>
                {contextMenu && (
                    <SlotContextMenu
                        state={contextMenu}
                        hasImage={!!base64}
                        hasBrands={hasBrands}
                        onInsertBrandAsset={() => setShowAssetPicker(true)}
                        onClearSlot={() => { unsetSlot(index); setError(null); }}
                        onClose={closeContextMenu}
                    />
                )}
            </AnimatePresence>

            {/* Asset picker modal (portal) */}
            <AnimatePresence>
                {showAssetPicker && (
                    <BrandAssetPickerModal
                        onClose={() => setShowAssetPicker(false)}
                        onSelect={(b64) => {
                            setSlot(index, b64);
                            setShowAssetPicker(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

// ── ImageSlotGrid ────────────────────────────────────────────────────────────

export function ImageSlotGrid({ maxSlots, videoMode = false }: { maxSlots: number; videoMode?: boolean }) {
    if (maxSlots === 0) return null;

    const [hasBrands, setHasBrands] = useState<boolean | null>(null);

    // Single fetch for all slots — lazy, on first context menu open
    const checkBrands = useCallback(async () => {
        if (hasBrands !== null) return;
        try {
            const res = await fetch("/api/brands");
            if (res.ok) {
                const data = await res.json();
                setHasBrands((data.brands ?? []).length > 0);
            }
        } catch { setHasBrands(false); }
    }, [hasBrands]);

    const slots = Array.from({ length: maxSlots }, (_, i) => i + 1);
    const sectionLabel = videoMode ? "Frames de Referência" : "Referências Visuais";
    const hint = videoMode
        ? "1º frame obrigatório · 2º frame = interpolação"
        : `Até ${maxSlots} imagens`;

    return (
        <HasBrandsContext.Provider value={hasBrands}>
            <div className="w-full">
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider">{sectionLabel}</label>
                    <span className="text-[10px] text-text-muted">{hint}</span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {slots.map((idx) => (
                        <ImageSlot key={idx} index={idx} videoMode={videoMode} onNeedBrandsCheck={checkBrands} />
                    ))}
                </div>
            </div>
        </HasBrandsContext.Provider>
    );
}
