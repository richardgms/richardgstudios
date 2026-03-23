"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

interface ImageModalProps {
    imageUrl: string | null;
    onClose: () => void;
}

function ImageModalInner({ imageUrl, onClose }: ImageModalProps) {
    const downloadName = useMemo(
        () => imageUrl ? `brainstorm-image-${crypto.randomUUID()}.png` : "",
        [imageUrl]
    );

    return (
        <AnimatePresence>
            {imageUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors backdrop-blur-md border border-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <img
                            src={imageUrl}
                            alt="Visualização em tela cheia"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                        />

                        <div className="absolute bottom-4 right-4 z-20">
                            <a
                                href={imageUrl}
                                download={downloadName}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface border border-border-default hover:bg-bg-glass-hover text-text-primary text-sm font-medium shadow-lg transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Baixar
                            </a>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export const ImageModal = memo(ImageModalInner);
