"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function DeleteConfirmModalInner({ isOpen, onConfirm, onCancel }: DeleteConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onCancel}
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
                            <h3 className="font-bold text-lg text-text-primary">Excluir Conversa?</h3>
                            <p className="text-sm text-text-secondary">
                                Essa ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover">Cancelar</button>
                            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20">Excluir</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export const DeleteConfirmModal = memo(DeleteConfirmModalInner);
