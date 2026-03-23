"use client";

import { Copy, Star, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { PromptWithMeta } from "@/lib/prompts";
import { getCategoryLabel } from "@/lib/prompts";

interface PromptCardProps {
    prompt: PromptWithMeta;
    onSelect?: (prompt: PromptWithMeta) => void;
    onCopy?: (prompt: PromptWithMeta) => void;
}

export function PromptCard({ prompt, onSelect, onCopy }: PromptCardProps) {
    const [copied, setCopied] = useState(false);
    const [imgError, setImgError] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        onCopy?.(prompt);
    };

    const previewUrl = !imgError && prompt.sourceMedia?.[0] ? prompt.sourceMedia[0] : null;

    return (
        <article
            onClick={() => onSelect?.(prompt)}
            className="glass-card group cursor-pointer overflow-hidden flex flex-col"
        >
            {/* Preview */}
            <div className="relative aspect-[4/3] bg-bg-surface overflow-hidden">
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={prompt.title}
                        loading="lazy"
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-purple-500/10">
                        <span className="text-4xl opacity-50">🎨</span>
                    </div>
                )}

                {/* Badge categoria */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-text-secondary">
                    {getCategoryLabel(prompt.category)}
                </span>
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col gap-2">
                <h3 className="font-display font-semibold text-sm text-text-primary line-clamp-1 group-hover:text-accent-light transition-colors">
                    {prompt.title}
                </h3>
                <p className="text-xs text-text-muted line-clamp-2 flex-1">
                    {prompt.description}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border-default">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:text-accent-light hover:bg-accent/10 transition-all"
                        title="Copiar prompt"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? "Copiado!" : "Copiar"}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(prompt);
                        }}
                        className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:text-accent-light hover:bg-accent/10 transition-all"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Ver
                    </button>
                </div>
            </div>
        </article>
    );
}
