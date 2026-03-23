"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/search-bar";
import { PromptCard } from "@/components/prompt-card";
import { PromptViewer } from "@/components/prompt-viewer";
import { CATEGORIES, type PromptWithMeta } from "@/lib/prompts";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PER_PAGE = 60;

export function BrowseContent() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get("category") || "";

    const [prompts, setPrompts] = useState<PromptWithMeta[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState(initialCategory);
    const [page, setPage] = useState(1);
    const [selectedPrompt, setSelectedPrompt] = useState<PromptWithMeta | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const fetchPrompts = useCallback(async (q: string, cat: string, pg: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (cat) params.set("category", cat);
            params.set("limit", String(PER_PAGE));
            params.set("offset", String((pg - 1) * PER_PAGE));

            const res = await fetch(`/api/prompts?${params}`);
            const data = await res.json();
            setPrompts(data.prompts);
            setTotal(data.total);
        } catch (err) {
            console.error("Erro ao buscar prompts:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchPrompts(query, category, page);
        }, 300);
        return () => clearTimeout(timeout);
    }, [query, category, page, fetchPrompts]);

    // Reset page on query/category change
    useEffect(() => {
        setPage(1);
    }, [query, category]);

    const activeCategory = useMemo(
        () => CATEGORIES.find((c) => c.id === category),
        [category]
    );

    // Generate visible page numbers
    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    const startItem = (page - 1) * PER_PAGE + 1;
    const endItem = Math.min(page * PER_PAGE, total);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-32">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="font-display font-bold text-2xl text-text-primary">
                    {activeCategory ? activeCategory.label : "Explorar Prompts"}
                </h1>
                <p className="text-sm text-text-muted">
                    {total.toLocaleString("pt-BR")} prompts encontrados
                    {total > PER_PAGE && (
                        <span className="ml-2 text-text-muted/60">
                            · Mostrando {startItem}–{endItem}
                        </span>
                    )}
                </p>
            </div>

            {/* Search */}
            <div className="flex gap-3 items-start">
                <div className="flex-1">
                    <SearchBar onSearch={setQuery} />
                </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setCategory("")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!category
                        ? "bg-accent text-white"
                        : "bg-bg-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover border border-border-default"
                        }`}
                >
                    Todas
                </button>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id === category ? "" : cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${cat.id === category
                            ? "bg-accent text-white"
                            : "bg-bg-glass text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover border border-border-default"
                            }`}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="glass-card animate-pulse">
                            <div className="aspect-[4/3] bg-bg-surface rounded-t-[16px]" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-bg-surface rounded w-3/4" />
                                <div className="h-3 bg-bg-surface rounded w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : prompts.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-text-secondary">Nenhum prompt encontrado</p>
                    <p className="text-xs text-text-muted mt-1">
                        Tente outra busca ou categoria
                    </p>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                    {prompts.map((prompt, i) => (
                        <motion.div
                            key={`${prompt.category}-${prompt.index}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                        >
                            <PromptCard prompt={prompt} onSelect={setSelectedPrompt} />
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
                <div className="flex items-center justify-center gap-1 pt-6">
                    {/* First */}
                    <button
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Primeira página"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                    {/* Prev */}
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Página anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page numbers */}
                    {getPageNumbers().map((p, i) =>
                        p === "..." ? (
                            <span key={`dots-${i}`} className="px-2 text-text-muted text-sm">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setPage(p as number)}
                                className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${page === p
                                        ? "bg-accent text-white shadow-lg shadow-accent/20"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg-glass border border-transparent hover:border-border-default"
                                    }`}
                            >
                                {p}
                            </button>
                        )
                    )}

                    {/* Next */}
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Próxima página"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* Last */}
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Última página"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Viewer Modal */}
            {selectedPrompt && (
                <PromptViewer
                    prompt={selectedPrompt}
                    onClose={() => setSelectedPrompt(null)}
                />
            )}
        </div>
    );
}
