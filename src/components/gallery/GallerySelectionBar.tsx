"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";

interface GallerySelectionBarProps {
    isVisible: boolean;
    selectedCount: number;
    isProcessing?: boolean;
    onCancel: () => void;
    onDelete: () => void;
}

export function GallerySelectionBar({
    isVisible,
    selectedCount,
    isProcessing = false,
    onCancel,
    onDelete,
}: GallerySelectionBarProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-bg-surface border border-border-default rounded-full shadow-2xl px-4 py-3 flex items-center gap-4 min-w-[320px] max-w-[90vw] overflow-hidden justify-between backdrop-blur-md"
                >
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-xs">
                            {selectedCount}
                        </span>
                        <span className="text-sm font-medium text-text-primary">
                            Selecionad{selectedCount === 1 ? 'o' : 'os'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="px-4 py-2 rounded-full text-xs font-medium text-text-secondary hover:bg-bg-glass-hover transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onDelete}
                            disabled={selectedCount === 0 || isProcessing}
                            className="px-4 py-2 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Excluir
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
