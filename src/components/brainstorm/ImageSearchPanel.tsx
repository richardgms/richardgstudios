"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Search,
    Loader2,
    ImageOff,
    CheckCircle,
    Plus,
    AlertCircle,
    Globe,
} from "lucide-react";
import Image from "next/image";

interface ImageResult {
    title: string;
    url: string;
    thumbnail: string;
    width: number;
    height: number;
    source: string;
}

interface ImageSearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onAddImages: (urls: string[]) => Promise<void>;
}

export function ImageSearchPanel({ isOpen, onClose, onAddImages }: ImageSearchPanelProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ImageResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notConfigured, setNotConfigured] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus search input when panel opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 150);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        const q = query.trim();
        if (!q || loading) return;

        setLoading(true);
        setError(null);
        setResults([]);
        setSelected(new Set());
        setNotConfigured(false);

        try {
            const res = await fetch(`/api/search-images?q=${encodeURIComponent(q)}`);
            const data = await res.json() as { configured?: boolean; results?: ImageResult[]; error?: string };

            if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
            if (!data.configured) {
                setNotConfigured(true);
                return;
            }
            if (!data.results?.length) {
                setError("Nenhuma imagem encontrada. Tente uma busca diferente.");
                return;
            }
            setResults(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha na busca.");
        } finally {
            setLoading(false);
        }
    }, [query, loading]);

    const toggleSelect = useCallback((url: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url);
            else next.add(url);
            return next;
        });
    }, []);

    const handleAdd = useCallback(async () => {
        if (!selected.size || adding) return;
        setAdding(true);
        try {
            await onAddImages(Array.from(selected));
            setSelected(new Set());
            onClose();
        } finally {
            setAdding(false);
        }
    }, [selected, adding, onAddImages, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") e.preventDefault(); // form onSubmit handles it; prevent double-fire
        if (e.key === "Escape") onClose();
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        transition={{ type: "spring", damping: 26, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl w-full rounded-t-3xl bg-bg-root border border-border-default border-b-0 shadow-2xl flex flex-col"
                        style={{ maxHeight: "80vh" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-border-default" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-text-primary">Buscar Referências Visuais</h2>
                                    <p className="text-[10px] text-text-muted">Encontre imagens da web para usar como referência</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search form */}
                        <form onSubmit={handleSearch} className="px-5 pb-3 shrink-0">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ex: moranguete tiktok trend, fashion editorial..."
                                        className="w-full pl-9 pr-3 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!query.trim() || loading}
                                    className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors shrink-0"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                                </button>
                            </div>
                        </form>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">

                            {/* Not configured */}
                            {notConfigured && (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-primary mb-1">Busca de imagens não configurada</p>
                                        <p className="text-xs text-text-muted max-w-xs">
                                            Adicione <code className="font-mono bg-bg-surface-hover px-1 rounded">GOOGLE_SEARCH_API_KEY</code> e{" "}
                                            <code className="font-mono bg-bg-surface-hover px-1 rounded">GOOGLE_SEARCH_CX</code> ao <code className="font-mono bg-bg-surface-hover px-1 rounded">.env.local</code> para ativar esta função.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    <ImageOff className="w-4 h-4 shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}

                            {/* Loading skeleton */}
                            {loading && (
                                <div className="grid grid-cols-3 gap-2">
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="aspect-square rounded-xl bg-bg-glass border border-border-default animate-pulse"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Results grid */}
                            {!loading && results.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {results.map((img) => {
                                        const isSelected = selected.has(img.url);
                                        return (
                                            <motion.button
                                                key={img.url}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={() => toggleSelect(img.url)}
                                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                                                    isSelected
                                                        ? "border-accent ring-2 ring-accent/30"
                                                        : "border-border-default hover:border-accent/40"
                                                }`}
                                            >
                                                <Image
                                                    src={`/api/proxy-image?url=${encodeURIComponent(img.thumbnail)}`}
                                                    alt={img.title}
                                                    fill
                                                    sizes="150px"
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                                {/* Source overlay on hover */}
                                                <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[9px] text-white/80 truncate">{img.source}</p>
                                                </div>
                                                {/* Selected overlay */}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                                                        <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                                                    </div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty state */}
                            {!loading && !notConfigured && !error && results.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                                    <Search className="w-10 h-10 text-text-muted/30" />
                                    <p className="text-sm text-text-muted">Pesquise imagens de referência para sua criação</p>
                                    <p className="text-xs text-text-muted/60">Ex: &quot;cyberpunk street photography&quot;, &quot;moranguete aesthetic&quot;</p>
                                </div>
                            )}
                        </div>

                        {/* Footer action */}
                        <AnimatePresence>
                            {selected.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="px-5 py-3 border-t border-border-default shrink-0 flex items-center justify-between"
                                >
                                    <p className="text-xs text-text-muted">
                                        {selected.size} {selected.size === 1 ? "imagem selecionada" : "imagens selecionadas"}
                                    </p>
                                    <button
                                        onClick={handleAdd}
                                        disabled={adding}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {adding ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        {adding ? "Adicionando..." : "Usar como referência"}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
