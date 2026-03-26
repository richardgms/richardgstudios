"use client";

import { X, Copy, Palette, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PromptWithMeta } from "@/lib/prompts";
import { getCategoryLabel } from "@/lib/prompts";
import { useAppStore } from "@/lib/store";

/* ─── Allowlist de protocolos seguros ─────────────────── */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

function isSafeUrl(href: string | undefined): boolean {
    if (!href) return false;
    try {
        const url = new URL(href, "https://placeholder.invalid");
        return SAFE_PROTOCOLS.includes(url.protocol);
    } catch {
        return false;
    }
}

/* ─── Componentes custom para ReactMarkdown ───────────── */
function createPromptMarkdownComponents() {
    return {
        a({ href, children }: { href?: string; children?: React.ReactNode }) {
            if (!isSafeUrl(href)) {
                return <span>{children}</span>;
            }
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {children}
                </a>
            );
        },
    };
}

const remarkPlugins = [remarkGfm];

/* ─── Sub-componente memoizado para o Markdown ────────── */
const PromptMarkdown = memo(function PromptMarkdown({ content }: { content: string }) {
    const components = useMemo(() => createPromptMarkdownComponents(), []);

    return (
        <ReactMarkdown
            remarkPlugins={remarkPlugins}
            components={components as any}
        >
            {content}
        </ReactMarkdown>
    );
});

/* ─── Componente principal ────────────────────────────── */
interface PromptViewerProps {
    prompt: PromptWithMeta | null;
    onClose: () => void;
}

export function PromptViewer({ prompt, onClose }: PromptViewerProps) {
    const [currentImg, setCurrentImg] = useState(0);
    const [copied, setCopied] = useState(false);
    const router = useRouter();
    const setPrompt = useAppStore((s) => s.setPrompt);

    if (!prompt) return null;

    const images = prompt.sourceMedia?.filter(Boolean) || [];

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleUseInStudio = () => {
        setPrompt(prompt.content);
        router.push("/studio");
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
                onClick={onClose}
            >
                <motion.dialog
                    open
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-3xl max-h-[85vh] bg-bg-surface border border-border-default rounded-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
                        <div>
                            <h2 className="font-display font-bold text-lg text-text-primary">
                                {prompt.title}
                            </h2>
                            <p className="text-xs text-text-muted mt-0.5">
                                {getCategoryLabel(prompt.category)}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-bg-surface-hover transition-colors"
                        >
                            <X className="w-5 h-5 text-text-muted" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Carrossel de imagens */}
                        {images.length > 0 && (
                            <div className="relative rounded-xl overflow-hidden bg-bg-root aspect-video">
                                <img
                                    src={images[currentImg]}
                                    alt={`Preview ${currentImg + 1}`}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                                {images.length > 1 && (
                                    <>
                                        <button
                                            onClick={() =>
                                                setCurrentImg((i) => (i - 1 + images.length) % images.length)
                                            }
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setCurrentImg((i) => (i + 1) % images.length)
                                            }
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition"
                                        >
                                            <ChevronRight className="w-4 h-4 text-white" />
                                        </button>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {images.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentImg(i)}
                                                    className={`w-2 h-2 rounded-full transition-all ${i === currentImg
                                                            ? "bg-accent w-5"
                                                            : "bg-white/40 hover:bg-white/60"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Descrição */}
                        <p className="text-sm text-text-secondary">{prompt.description}</p>

                        {/* Prompt — Markdown renderizado */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                Prompt
                            </p>
                            <div className="prompt-text p-4 rounded-xl bg-bg-root border border-border-default max-h-60 overflow-y-auto">
                                <PromptMarkdown content={prompt.content} />
                            </div>
                        </div>

                        {prompt.needReferenceImages && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <span className="text-amber-400 text-xs">⚠️ Este prompt precisa de imagens de referência</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 px-6 py-4 border-t border-border-default">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface-hover hover:bg-bg-elevated text-sm text-text-primary transition-all"
                        >
                            <Copy className="w-4 h-4" />
                            {copied ? "Copiado!" : "Copiar Prompt"}
                        </button>
                        <button
                            onClick={handleUseInStudio}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-sm text-white font-medium transition-all ml-auto"
                        >
                            <Palette className="w-4 h-4" />
                            Usar no Studio
                        </button>
                    </div>
                </motion.dialog>
            </motion.div>
        </AnimatePresence>
    );
}
