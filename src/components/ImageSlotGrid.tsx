import React, { useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { compressImage, getBase64Size } from "@/lib/image-utils";
import { AlertTriangle, ImageIcon, Plus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getSlotLabel = (index: number) => `Referência ${index}`;

interface ImageSlotProps {
    index: number;
}

function ImageSlot({ index }: ImageSlotProps) {
    const { attachments, setSlot, unsetSlot } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const base64 = attachments[index] || null;
    const label = getSlotLabel(index);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
            // Hardcoded validation sum rule assuming total 3MB for all slots
            // Since compression is aggressive, normally 1 image doesn't break limits
            const compressedBase64 = await compressImage(file, 1024, 0.7);
            setSlot(index, compressedBase64);
        } catch (err) {
            console.error("Compression error", err);
            setError("Erro ao processar imagem.");
        } finally {
            setIsLoading(false);
            // Prevent locking same file
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        unsetSlot(index);
        setError(null);
    };

    return (
        <div className="relative flex flex-col gap-1 w-24">
            <div
                className={`relative group w-24 h-24 rounded-xl overflow-hidden shadow-sm transition-all
          ${base64 ? 'border border-border-default bg-black/20' : 'border-2 border-dashed border-border-default hover:border-accent hover:bg-accent/5 cursor-pointer bg-bg-glass'}`}
                onClick={() => !base64 && !isLoading && fileInputRef.current?.click()}
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
                        <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                            <img src={base64} alt={`Slot ${index}`} className="w-full h-full object-cover" />
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

                {/* Hidden Input controlled securely from within the component */}
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
            </div>

            {/* Label and Errors */}
            <div className="text-center w-full">
                {error ? (
                    <span className="text-[9px] text-red-400 leading-tight block" title={error}>{error}</span>
                ) : (
                    <span className="text-[10px] text-text-muted truncate max-w-full block" title={label}>{label}</span>
                )}
            </div>
        </div>
    );
}

export function ImageSlotGrid({ maxSlots }: { maxSlots: number }) {
    if (maxSlots === 0) return null;

    const slots = Array.from({ length: maxSlots }, (_, i) => i + 1);

    return (
        <div className="w-full mb-4">
            <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-text-muted" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Referências Visuais Fixas
                </h3>
                <span className="text-[10px] text-text-muted bg-border-default/50 px-2 py-0.5 rounded-full ml-auto">
                    Até {maxSlots} imagens suportadas
                </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-hide">
                {slots.map((idx) => (
                    <ImageSlot key={idx} index={idx} />
                ))}
            </div>
        </div>
    );
}
