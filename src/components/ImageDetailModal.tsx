"use client";

import { useState, useEffect, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Copy, Check, Download, Loader2, Sparkles, Star, Ban,
    Ratio, BrainCircuit, ImageIcon, AlertTriangle, Video, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import { AttachmentLightbox } from "@/components/AttachmentLightbox";
import { localImageLoader } from "@/lib/image-loader";

// ─── Tipo canônico unificado ──────────────────────────────────────────────────

export interface GenerationDetail {
    id: string;
    prompt: string;
    model: string;
    /** URL já resolvida para uso direto em src */
    imageUrl: string;
    aspectRatio?: string;
    resolution?: string;
    mediaType?: "image" | "video";
    created_at?: string;
    /** URLs das imagens de referência (anexos) */
    attachments?: string[];
    /** JSON string que pode conter { thinkingLevel: string } */
    metadata?: string;
    isFavorite?: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ImageDetailModalProps {
    gen: GenerationDetail;
    onClose: () => void;
    /** Se fornecido, exibe o botão "Usar como Base" (contexto da Galeria) */
    onUseAsBase?: (gen: GenerationDetail) => void;
    /** Se fornecido, exibe o botão "Favoritar / Desfavoritar" (contexto do Studio) */
    onToggleFavorite?: (genId: string, currentState: boolean) => Promise<void>;
    /** Habilita modal de confirmação antes de desfavoritar. Só relevante com onToggleFavorite. */
    requireUnfavoriteConfirmation?: boolean;
    onNext?: () => void;
    onPrevious?: () => void;
    currentIndex?: number;
    totalImages?: number;
    onDelete?: (genId: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveModelName(model: string): string {
    if (model === "pro") return "Nano Banana 2";
    if (model === "nb-pro") return "Nano Banana Pro";
    if (model === "flash") return "Flash 2.5";
    if (model === "imagen") return "Imagen 4 Ultra";
    if (model === "veo-3.1") return "Veo 3.1";
    if (model === "veo-3.1-fast") return "Veo Fast";
    return model;
}

function extractThinkingLevel(metadata?: string): string | null {
    if (!metadata) return null;
    try {
        return JSON.parse(metadata).thinkingLevel ?? null;
    } catch {
        return null;
    }
}

function isVideoUrl(url: string) {
    return url.endsWith(".mp4");
}

// ─── Sub-componente: botão de copiar prompt ────────────────────────────────────

function CopyPromptButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handle = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handle}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-bg-surface border border-border-default text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            title="Copiar prompt"
        >
            {copied
                ? <Check className="w-3.5 h-3.5 text-green-400" />
                : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function ImageDetailModalInner({
    gen,
    onClose,
    onUseAsBase,
    onToggleFavorite,
    requireUnfavoriteConfirmation = true,
    onNext,
    onPrevious,
    currentIndex,
    totalImages,
    onDelete,
}: ImageDetailModalProps) {
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);
    const [copiedImage, setCopiedImage] = useState(false);
    const [isDownloadingFormat, setIsDownloadingFormat] = useState<"webp" | "jpg" | null>(null);
    const [isFavorite, setIsFavorite] = useState(!!gen.isFavorite);
    const [isTogglingFav, setIsTogglingFav] = useState(false);
    const [showUnfavoriteConfirm, setShowUnfavoriteConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync isFavorite from prop
    useEffect(() => { setIsFavorite(!!gen.isFavorite); }, [gen.isFavorite]);

    // Fechar com Escape e Navegar com atalhos
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" && onNext) onNext();
            if (e.key === "ArrowLeft" && onPrevious) onPrevious();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose, onNext, onPrevious]);

    const thinkingLevel = extractThinkingLevel(gen.metadata);
    const isVideo = gen.mediaType === "video" || isVideoUrl(gen.imageUrl);
    const attachments = gen.attachments ?? [];
    const showThinkingLevel =
        thinkingLevel && (gen.model === "pro" || gen.model === "nb-pro");

    // ── Copy Image ──────────────────────────────────────────────────────────

    const handleCopyImage = async () => {
        if (isVideo) return;
        setIsCopying(true);
        try {
            const img = document.createElement("img");
            img.crossOrigin = "anonymous";
            img.src = gen.imageUrl;
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d")?.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
                if (!blob) { setIsCopying(false); return; }
                try {
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                    setCopiedImage(true);
                    setTimeout(() => setCopiedImage(false), 2000);
                } catch (err) {
                    console.error("Erro ao copiar:", err);
                } finally { setIsCopying(false); }
            }, "image/png");
        } catch (e) {
            console.error(e);
            setIsCopying(false);
        }
    };

    // ── Download Format ─────────────────────────────────────────────────────

    const handleDownloadFormat = async (format: "webp" | "jpg") => {
        if (isVideo) return;
        setIsDownloadingFormat(format);
        try {
            const mimeType = format === "webp" ? "image/webp" : "image/jpeg";
            const img = document.createElement("img");
            img.crossOrigin = "anonymous";
            img.src = gen.imageUrl;
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context missing");
            if (format === "jpg") { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            ctx.drawImage(img, 0, 0);
            const link = document.createElement("a");
            link.href = canvas.toDataURL(mimeType, 0.95);
            link.download = `nano-banana-${gen.id}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(`Erro ao baixar em ${format}:`, e);
        } finally {
            setIsDownloadingFormat(null);
        }
    };

    // ── Toggle Favorite ─────────────────────────────────────────────────────

    const handleFavoriteClick = async () => {
        if (!onToggleFavorite) return;
        if (isFavorite && requireUnfavoriteConfirmation) {
            setShowUnfavoriteConfirm(true);
            return;
        }
        setIsTogglingFav(true);
        try {
            await onToggleFavorite(gen.id, isFavorite);
            setIsFavorite((prev) => !prev);
        } finally { setIsTogglingFav(false); }
    };

    const handleConfirmUnfavorite = async () => {
        if (!onToggleFavorite) return;
        setShowUnfavoriteConfirm(false);
        setIsTogglingFav(true);
        try {
            await onToggleFavorite(gen.id, true);
            setIsFavorite(false);
        } finally { setIsTogglingFav(false); }
    };

    const handleConfirmDelete = async () => {
        if (!onDelete) return;
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await onDelete(gen.id);
            onClose(); // Close modal after successful deletion
        } catch (err) {
            console.error("Erro ao deletar imagem:", err);
            setIsDeleting(false); // Only set to false on error, because on success it closes anyway
        }
    };

    return (
        <>
            <motion.div
                key="detail-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative max-w-5xl w-full max-h-[90vh] bg-bg-surface border border-border-default rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Setinhas de Navegação (Desktop) Fora do Modal principal ── */}
                    {onPrevious && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                            style={{ left: 'max(1rem, calc((100vw - min(1024px, 100vw)) / 4 - 32px))' }}
                            className="fixed top-1/2 -translate-y-1/2 z-[110] p-4 rounded-full bg-black/40 text-white/50 hover:bg-black/80 hover:text-white transition-all backdrop-blur-md border border-white/10 hover:scale-110 shadow-2xl hidden md:flex"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}

                    {onNext && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            style={{ right: 'max(1rem, calc((100vw - min(1024px, 100vw)) / 4 - 32px))' }}
                            className="fixed top-1/2 -translate-y-1/2 z-[110] p-4 rounded-full bg-black/40 text-white/50 hover:bg-black/80 hover:text-white transition-all backdrop-blur-md border border-white/10 hover:scale-110 shadow-2xl hidden md:flex"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}

                    {/* ── Botão Fechar ─────────────────────────────────── */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors backdrop-blur-md border border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* ── Painel de Mídia ──────────────────────────────── */}
                    <div className="flex-1 bg-black/50 flex items-center justify-center p-4 min-h-[40vh] relative group/media">
                        {/* Mobile Navigation Only (on top of image) */}
                        {onPrevious && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white/50 active:bg-black/80 active:text-white transition-all backdrop-blur-md border border-white/10 z-10 md:hidden flex"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        {onNext && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onNext(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white/50 active:bg-black/80 active:text-white transition-all backdrop-blur-md border border-white/10 z-10 md:hidden flex"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                        {isVideo ? (
                            <video
                                src={gen.imageUrl}
                                controls
                                autoPlay
                                loop
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        ) : (
                            <img
                                src={gen.imageUrl}
                                alt={gen.prompt.slice(0, 60)}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                            />
                        )}
                        {isVideo && (
                            <div className="absolute top-4 left-4 p-1.5 rounded-md bg-black/60 backdrop-blur-sm border border-border-default/50">
                                <Video className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                    </div>

                    {/* ── Painel de Detalhes ───────────────────────────── */}
                    <div className="w-full md:w-96 bg-bg-surface border-l border-border-default flex flex-col">
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">

                            {/* Prompt */}
                            <div>
                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Prompt
                                </h3>
                                <div className="p-4 bg-bg-glass rounded-xl border border-border-default relative group">
                                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{gen.prompt}</p>
                                    <CopyPromptButton text={gen.prompt} />
                                </div>
                            </div>

                            {/* Referências de Anexos */}
                            {attachments.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                                        Referências Utilizadas
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {attachments.map((url, i) => (
                                            <motion.button
                                                key={`${gen.id}-att-${i}`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setLightboxUrl(url)}
                                                className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-default hover:border-accent/50 transition-colors"
                                            >
                                                <Image
                                                    loader={localImageLoader}
                                                    src={url}
                                                    alt={`Referência ${i + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadados */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Modelo</h3>
                                    <p className="text-sm text-text-secondary">{resolveModelName(gen.model)}</p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Proporção</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                                        <Ratio className="w-3.5 h-3.5 text-text-muted" />
                                        {gen.aspectRatio || "1:1"}
                                    </div>
                                </div>
                                {gen.resolution && (
                                    <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Resolução</h3>
                                        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                                            <ImageIcon className="w-3.5 h-3.5 text-text-muted" />
                                            {gen.resolution}
                                        </div>
                                    </div>
                                )}
                                {showThinkingLevel && (
                                    <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Thinking Level</h3>
                                        <div className="flex items-center gap-1.5 text-sm text-text-secondary capitalize">
                                            <BrainCircuit className="w-3.5 h-3.5 text-accent" />
                                            {thinkingLevel!.toLowerCase()}
                                        </div>
                                    </div>
                                )}
                                {gen.created_at && (
                                    <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Data</h3>
                                        <p className="text-sm text-text-secondary">
                                            {new Date(gen.created_at).toLocaleDateString("pt-BR")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Footer de Ações ──────────────────────────── */}
                        <div className="p-4 border-t border-border-default bg-bg-glass/50 gap-3 flex flex-col">

                            {/* Usar como Base (apenas Galeria) */}
                            {onUseAsBase && (
                                <button
                                    onClick={() => onUseAsBase(gen)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Usar como Base
                                </button>
                            )}

                            <div className="flex gap-2 w-full">
                                {/* Favoritar (apenas Studio) */}
                                {onToggleFavorite && (
                                    <button
                                        onClick={handleFavoriteClick}
                                        disabled={isTogglingFav || isDeleting}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm disabled:opacity-50 ${isFavorite
                                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 group/fav"
                                            : "bg-bg-surface text-text-secondary border border-border-default hover:bg-bg-glass-hover hover:text-text-primary shadow-sm"
                                            }`}
                                    >
                                        {isTogglingFav ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isFavorite ? (
                                            <>
                                                <span className="group-hover/fav:hidden flex items-center gap-2">
                                                    <Star className="w-4 h-4 fill-amber-400" /> Favoritado
                                                </span>
                                                <span className="hidden group-hover/fav:flex items-center gap-2">
                                                    <Ban className="w-4 h-4" /> Desfavoritar
                                                </span>
                                            </>
                                        ) : (
                                            <><Star className="w-4 h-4" /> Favoritar</>
                                        )}
                                    </button>
                                )}

                                {/* Excluir (Mover para Lixeira) */}
                                {onDelete && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isDeleting || isTogglingFav}
                                        className="flex-[0.5] flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm disabled:opacity-50 bg-bg-surface text-text-secondary border border-border-default hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 shadow-sm"
                                        title="Mover para Lixeira"
                                    >
                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Lixeira</>}
                                    </button>
                                )}
                            </div>

                            {/* Download grid: Copiar | WebP | JPG */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={handleCopyImage}
                                    disabled={isCopying || isVideo}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium bg-bg-surface text-text-secondary border border-border-default hover:bg-bg-glass-hover hover:text-text-primary transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Copiar para área de transferência"
                                >
                                    {isCopying
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : copiedImage
                                            ? <Check className="w-3.5 h-3.5 text-green-500" />
                                            : <Copy className="w-3.5 h-3.5" />}
                                    <span>Copiar</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadFormat("webp")}
                                    disabled={isDownloadingFormat !== null || isVideo}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium bg-bg-surface text-text-secondary border border-border-default hover:bg-bg-glass-hover hover:text-text-primary transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Baixar alta compressão"
                                >
                                    {isDownloadingFormat === "webp"
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Download className="w-3.5 h-3.5" />}
                                    WebP
                                </button>
                                <button
                                    onClick={() => handleDownloadFormat("jpg")}
                                    disabled={isDownloadingFormat !== null || isVideo}
                                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium bg-bg-surface text-text-secondary border border-border-default hover:bg-bg-glass-hover hover:text-text-primary transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Baixar com fundo branco"
                                >
                                    {isDownloadingFormat === "jpg"
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Download className="w-3.5 h-3.5" />}
                                    JPG
                                </button>
                            </div>

                            {/* Download Original (PNG) */}
                            {!isVideo && (
                                <a
                                    href={gen.imageUrl}
                                    download={`nano-banana-${gen.id}.png`}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-bg-surface text-text-primary border border-border-default hover:bg-bg-glass-hover transition-all text-sm opacity-90 hover:opacity-100 shadow-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar Original (PNG)
                                </a>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* ── Lightbox de Referências ───────────────────────────────── */}
            {lightboxUrl && (
                <AttachmentLightbox
                    key="detail-lightbox"
                    url={lightboxUrl}
                    onClose={() => setLightboxUrl(null)}
                />
            )}

            {/* ── Modal de Confirmação de Exclusão ──────────────────────── */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowDeleteConfirm(false)}
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
                                <h3 className="font-bold text-lg text-text-primary">Mover para a Lixeira?</h3>
                                <p className="text-sm text-text-secondary">
                                    O item será removido e enviado para a lixeira.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lixeira"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Modal de Confirmação de Desfavoritar ──────────────────── */}
            <AnimatePresence>
                {showUnfavoriteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowUnfavoriteConfirm(false)}
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
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary">Remover dos Favoritos?</h3>
                                <p className="text-sm text-text-secondary">
                                    Tem certeza que deseja remover esta imagem dos seus favoritos?
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowUnfavoriteConfirm(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmUnfavorite}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    Remover
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export const ImageDetailModal = memo(ImageDetailModalInner);
