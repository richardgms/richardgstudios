"use client";

import { motion } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface AttachmentLightboxProps {
    url: string;
    onClose: () => void;
}

export function AttachmentLightbox({ url, onClose }: AttachmentLightboxProps) {
    const [isCopying, setIsCopying] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopy = async () => {
        if (isCopying) return;
        setIsCopying(true);
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            // Standardize to image/png for clipboard support
            let pngBlob = blob;
            if (blob.type !== "image/png") {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = URL.createObjectURL(blob);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);

                const convertedBlob = await new Promise<Blob | null>((resolve) =>
                    canvas.toBlob(resolve, "image/png")
                );

                if (convertedBlob) {
                    pngBlob = convertedBlob;
                }
                URL.revokeObjectURL(img.src);
            }

            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": pngBlob })
            ]);

            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error("Failed to copy image:", err);
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all z-20"
            >
                <X className="w-6 h-6" />
            </button>
            <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                src={url}
                alt="Attachment full screen"
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg z-10"
                style={{ touchAction: "pinch-zoom" }}
                onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-10 flex gap-4 z-20">
                <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                    disabled={isCopying}
                    className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-all flex items-center gap-2 shadow-xl disabled:opacity-50"
                >
                    {copySuccess ? (
                        <><Check className="w-4 h-4 text-green-600" /> Copiado!</>
                    ) : (
                        <><Copy className="w-4 h-4" /> {isCopying ? "Copiando..." : "Copiar Imagem"}</>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
