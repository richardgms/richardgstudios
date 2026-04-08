"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare } from "lucide-react";

interface SelectAllToastProps {
    isVisible: boolean;
    totalCount: number;
    onSelectAll: () => void;
}

export function SelectAllToast({ isVisible, totalCount, onSelectAll }: SelectAllToastProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -60, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -60, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] bg-bg-surface/95 border border-border-default rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 backdrop-blur-md"
                >
                    <CheckSquare className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-sm text-text-primary whitespace-nowrap">
                        Selecionar todos os{" "}
                        <span className="font-bold text-accent">{totalCount}</span> itens?
                    </span>
                    <button
                        onClick={onSelectAll}
                        className="ml-1 px-3 py-1 rounded-full bg-accent text-white text-xs font-bold hover:bg-accent/80 transition-colors shrink-0"
                    >
                        Selecionar
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
