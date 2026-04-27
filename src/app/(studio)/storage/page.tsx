"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    HardDrive,
    RefreshCw,
    AlertTriangle,
    Trash2,
    CheckSquare,
    Square,
    ChevronLeft,
    Image as ImageIcon,
    Video,
    Paperclip,
    MessageSquare,
    Film,
    Tag,
    Boxes,
    Database,
    Loader2,
    ArrowDownAZ,
    ArrowDownWideNarrow,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type CategoryId =
    | "gen-images"
    | "gen-videos"
    | "gen-attachments"
    | "chat-thumbs"
    | "video-thumbs"
    | "brand-assets"
    | "other";

type CategoryAggregate = {
    id: CategoryId;
    label: string;
    description: string;
    count: number;
    size: number;
};

type DbStats = {
    brainstormSessions: number;
    brainstormMessages: number;
    studioSessions: number;
    generations: number;
    brandKits: number;
    brandAssets: number;
    promptSavePrompts: number;
    kanboardCards: number;
};

type SummaryResponse = {
    backend: "r2" | "local";
    total: { count: number; size: number };
    categories: CategoryAggregate[];
    database: DbStats;
    generatedAt: string;
};

type StorageItem = {
    key: string;
    size: number;
    lastModified: string;
    category: CategoryId;
    url: string;
};

type ItemsResponse = {
    category: CategoryId;
    label: string;
    items: StorageItem[];
    nextCursor: number | null;
    totalCount: number;
    totalSize: number;
};

// ─── Util ─────────────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<CategoryId, typeof ImageIcon> = {
    "gen-images": ImageIcon,
    "gen-videos": Video,
    "gen-attachments": Paperclip,
    "chat-thumbs": MessageSquare,
    "video-thumbs": Film,
    "brand-assets": Tag,
    other: Boxes,
};

const CATEGORY_COLOR: Record<CategoryId, { bg: string; text: string; border: string; bar: string }> = {
    "gen-images": { bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/30", bar: "bg-indigo-500" },
    "gen-videos": { bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30", bar: "bg-purple-500" },
    "gen-attachments": { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30", bar: "bg-blue-500" },
    "chat-thumbs": { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30", bar: "bg-emerald-500" },
    "video-thumbs": { bg: "bg-pink-500/10", text: "text-pink-300", border: "border-pink-500/30", bar: "bg-pink-500" },
    "brand-assets": { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", bar: "bg-amber-500" },
    other: { bg: "bg-zinc-500/10", text: "text-zinc-300", border: "border-zinc-500/30", bar: "bg-zinc-500" },
};

function formatBytes(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value.toFixed(value >= 100 || i === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
        return iso;
    }
}

function isImageKey(key: string): boolean {
    return /\.(webp|png|jpe?g|gif|avif)$/i.test(key);
}

function previewUrl(item: StorageItem): string {
    // R2 (http/https) → proxy para evitar CORS; local (/api/images/...) → direto.
    if (/^https?:\/\//i.test(item.url)) {
        return `/api/proxy-image?url=${encodeURIComponent(item.url)}`;
    }
    return item.url;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function StoragePage() {
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("");

    const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
    const [items, setItems] = useState<StorageItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [totalSize, setTotalSize] = useState(0);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"size" | "date">("size");

    // ─── Data fetchers ────────────────────────────────────────────────────────

    const fetchSummary = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch("/api/storage/summary", { cache: "no-store" });
            if (res.ok) {
                const data = (await res.json()) as SummaryResponse;
                setSummary(data);
            }
        } catch (err) {
            console.error("[storage] fetchSummary erro", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchItems = useCallback(async (cat: CategoryId, opts?: { cursor?: number; replace?: boolean }) => {
        setItemsLoading(true);
        try {
            const sp = new URLSearchParams({
                category: cat,
                sort,
                cursor: String(opts?.cursor ?? 0),
            });
            if (search) sp.set("q", search);
            const res = await fetch(`/api/storage/items?${sp}`, { cache: "no-store" });
            if (res.ok) {
                const data = (await res.json()) as ItemsResponse;
                setItems((prev) => (opts?.replace ?? true ? data.items : [...prev, ...data.items]));
                setNextCursor(data.nextCursor);
                setTotalCount(data.totalCount);
                setTotalSize(data.totalSize);
            }
        } catch (err) {
            console.error("[storage] fetchItems erro", err);
        } finally {
            setItemsLoading(false);
        }
    }, [sort, search]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        if (activeCategory) {
            setSelectedKeys(new Set());
            fetchItems(activeCategory, { cursor: 0, replace: true });
        }
    }, [activeCategory, sort, search, fetchItems]);

    // ─── Progress helpers ─────────────────────────────────────────────────────

    const finishProgress = () => {
        setProgress(100);
        setTimeout(() => {
            setProgress(0);
            setProgressLabel("");
        }, 600);
    };

    // ─── Ações destrutivas ────────────────────────────────────────────────────

    const handleDeleteSelected = async () => {
        if (selectedKeys.size === 0 || !activeCategory) return;
        if (!confirm(`Apagar ${selectedKeys.size} item(s) PERMANENTEMENTE? Essa ação remove do R2 e limpa as referências no banco.`)) return;

        setActionLoading(true);
        setProgressLabel(`Apagando ${selectedKeys.size} item(s)...`);
        setProgress(15);
        try {
            const res = await fetch("/api/storage/items", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keys: Array.from(selectedKeys) }),
            });
            setProgress(70);
            if (!res.ok) throw new Error(await res.text());
            await Promise.all([
                fetchItems(activeCategory, { cursor: 0, replace: true }),
                fetchSummary(true),
            ]);
            setSelectedKeys(new Set());
            finishProgress();
        } catch (err) {
            console.error(err);
            setProgress(0);
            setProgressLabel("");
            alert("Falha ao apagar itens.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEmptyCategory = async (cat: CategoryId, label: string) => {
        if (!confirm(`Esvaziar a categoria "${label}"? Todos os arquivos dessa categoria serão removidos do R2 e referências no banco serão limpas. Essa ação NÃO pode ser desfeita.`)) return;
        if (!confirm(`Confirma novamente: apagar TUDO em "${label}"?`)) return;

        setActionLoading(true);
        setProgressLabel(`Esvaziando ${label}...`);
        setProgress(20);
        try {
            const res = await fetch("/api/storage/category", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: cat }),
            });
            setProgress(75);
            if (!res.ok) throw new Error(await res.text());
            await fetchSummary(true);
            if (activeCategory === cat) {
                await fetchItems(cat, { cursor: 0, replace: true });
            }
            finishProgress();
        } catch (err) {
            console.error(err);
            setProgress(0);
            setProgressLabel("");
            alert("Falha ao esvaziar categoria.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleWipeDatabase = async (target: "brainstorm" | "studio-sessions", label: string) => {
        if (!confirm(`Esvaziar "${label}"? Isso apaga as sessões e mensagens permanentemente do banco e os arquivos associados no R2.`)) return;
        if (!confirm(`Confirma novamente: zerar "${label}"?`)) return;

        setActionLoading(true);
        setProgressLabel(`Esvaziando ${label}...`);
        setProgress(20);
        try {
            const res = await fetch("/api/storage/database", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target }),
            });
            setProgress(75);
            if (!res.ok) throw new Error(await res.text());
            await fetchSummary(true);
            if (activeCategory) {
                await fetchItems(activeCategory, { cursor: 0, replace: true });
            }
            finishProgress();
        } catch (err) {
            console.error(err);
            setProgress(0);
            setProgressLabel("");
            alert("Falha ao limpar banco.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEmptyAll = async () => {
        if (!confirm("⚠️ Você está prestes a APAGAR TODO o conteúdo do bucket R2 e zerar gerações, chats, marcas, anexos e thumbnails. Isso não pode ser desfeito. Continuar?")) return;
        const phrase = "APAGAR TUDO";
        const typed = window.prompt(`Confirme digitando exatamente: ${phrase}`);
        if (typed !== phrase) {
            alert("Texto não confere. Cancelado.");
            return;
        }

        setActionLoading(true);
        setProgressLabel("Esvaziando armazenamento completo...");
        setProgress(15);
        try {
            const res = await fetch("/api/storage/category", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: "all", confirmAll: true }),
            });
            setProgress(80);
            if (!res.ok) throw new Error(await res.text());
            await fetchSummary(true);
            if (activeCategory) {
                await fetchItems(activeCategory, { cursor: 0, replace: true });
            }
            finishProgress();
        } catch (err) {
            console.error(err);
            setProgress(0);
            setProgressLabel("");
            alert("Falha ao esvaziar armazenamento.");
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Derivados ────────────────────────────────────────────────────────────

    const maxCategorySize = useMemo(() => {
        if (!summary) return 1;
        return Math.max(1, ...summary.categories.map((c) => c.size));
    }, [summary]);

    const allSelected = items.length > 0 && items.every((i) => selectedKeys.has(i.key));

    const toggleSelect = (key: string) => {
        const next = new Set(selectedKeys);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setSelectedKeys(next);
    };

    const toggleSelectAll = () => {
        if (allSelected) setSelectedKeys(new Set());
        else setSelectedKeys(new Set(items.map((i) => i.key)));
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 flex flex-col h-full bg-bg-surface overflow-hidden relative">
            {/* Progress bar */}
            <AnimatePresence>
                {progress > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 left-0 right-0 z-50"
                    >
                        <div className="h-0.5 bg-bg-depth/60 w-full">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 via-accent to-indigo-400"
                                initial={{ width: "0%" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                        </div>
                        {progress < 100 && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-bg-depth/90 border border-border-default rounded-full px-3 py-1 text-xs text-text-muted backdrop-blur-sm whitespace-nowrap"
                            >
                                {progressLabel}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="h-16 border-b border-border-default flex items-center justify-between px-6 shrink-0 bg-bg-surface/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <HardDrive className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg text-text-primary">Armazenamento</h1>
                        <p className="text-xs text-text-muted">
                            {summary
                                ? `${summary.backend === "r2" ? "Cloudflare R2" : "Local"} · ${formatBytes(summary.total.size)} em ${summary.total.count} objeto(s)`
                                : "Calculando uso de armazenamento..."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchSummary(true)}
                        disabled={loading || refreshing || actionLoading}
                        className="px-3 py-2 rounded-lg bg-bg-glass hover:bg-bg-glass-hover border border-border-default text-text-secondary hover:text-text-primary text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Atualizar
                    </button>
                    <button
                        onClick={handleEmptyAll}
                        disabled={!summary || summary.total.count === 0 || actionLoading}
                        className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Esvaziar tudo
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-text-muted">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculando uso...
                    </div>
                ) : !summary ? (
                    <div className="h-64 flex items-center justify-center text-text-muted">
                        Não foi possível carregar o uso do armazenamento.
                    </div>
                ) : activeCategory ? (
                    <CategoryDetail
                        categoryId={activeCategory}
                        items={items}
                        itemsLoading={itemsLoading}
                        nextCursor={nextCursor}
                        totalCount={totalCount}
                        totalSize={totalSize}
                        selectedKeys={selectedKeys}
                        toggleSelect={toggleSelect}
                        toggleSelectAll={toggleSelectAll}
                        allSelected={allSelected}
                        sort={sort}
                        setSort={setSort}
                        search={search}
                        setSearch={setSearch}
                        actionLoading={actionLoading}
                        onBack={() => {
                            setActiveCategory(null);
                            setSelectedKeys(new Set());
                            setSearch("");
                        }}
                        onLoadMore={() => activeCategory && nextCursor !== null && fetchItems(activeCategory, { cursor: nextCursor, replace: false })}
                        onDeleteSelected={handleDeleteSelected}
                        onEmptyCategory={(cat, label) => handleEmptyCategory(cat, label)}
                    />
                ) : (
                    <Overview
                        summary={summary}
                        maxCategorySize={maxCategorySize}
                        actionLoading={actionLoading}
                        onOpenCategory={(cat) => setActiveCategory(cat)}
                        onEmptyCategory={(cat, label) => handleEmptyCategory(cat, label)}
                        onWipeDatabase={handleWipeDatabase}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({
    summary,
    maxCategorySize,
    actionLoading,
    onOpenCategory,
    onEmptyCategory,
    onWipeDatabase,
}: {
    summary: SummaryResponse;
    maxCategorySize: number;
    actionLoading: boolean;
    onOpenCategory: (cat: CategoryId) => void;
    onEmptyCategory: (cat: CategoryId, label: string) => void;
    onWipeDatabase: (target: "brainstorm" | "studio-sessions", label: string) => void;
}) {
    const db = summary.database;
    const dbItems = [
        { label: "Sessões Brainstorm", value: db.brainstormSessions, icon: MessageSquare },
        { label: "Mensagens Brainstorm", value: db.brainstormMessages, icon: MessageSquare },
        { label: "Sessões Studio", value: db.studioSessions, icon: HardDrive },
        { label: "Gerações", value: db.generations, icon: ImageIcon },
        { label: "Brand Kits", value: db.brandKits, icon: Tag },
        { label: "Assets de Marca", value: db.brandAssets, icon: Tag },
        { label: "Prompts salvos", value: db.promptSavePrompts, icon: Database },
        { label: "Cards KanBoard", value: db.kanboardCards, icon: Database },
    ];

    const wipeRows = [
        {
            target: "brainstorm" as const,
            label: "Sessões do Brainstorm",
            description: `${db.brainstormSessions.toLocaleString("pt-BR")} sessão(ões) e ${db.brainstormMessages.toLocaleString("pt-BR")} mensagem(ns) — também limpa os anexos no R2.`,
            icon: MessageSquare,
            disabled: db.brainstormSessions === 0 && db.brainstormMessages === 0,
        },
        {
            target: "studio-sessions" as const,
            label: "Sessões do Studio (histórico)",
            description: `${db.studioSessions.toLocaleString("pt-BR")} sessão(ões) — apaga também as gerações vinculadas e seus arquivos.`,
            icon: HardDrive,
            disabled: db.studioSessions === 0,
        },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiCard
                    icon={<HardDrive className="w-4 h-4" />}
                    label="Total armazenado"
                    value={formatBytes(summary.total.size)}
                    hint={`${summary.total.count} objeto(s)`}
                />
                <KpiCard
                    icon={<Boxes className="w-4 h-4" />}
                    label="Backend"
                    value={summary.backend === "r2" ? "Cloudflare R2" : "Local"}
                    hint={summary.backend === "r2" ? "Produção" : "Desenvolvimento"}
                />
                <KpiCard
                    icon={<Database className="w-4 h-4" />}
                    label="Atualizado em"
                    value={formatDate(summary.generatedAt)}
                    hint="Clique em Atualizar para recalcular"
                />
            </div>

            {/* Categorias */}
            <section>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Por categoria</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {summary.categories.map((cat) => (
                        <CategoryCard
                            key={cat.id}
                            cat={cat}
                            maxSize={maxCategorySize}
                            actionLoading={actionLoading}
                            onOpen={() => onOpenCategory(cat.id)}
                            onEmpty={() => onEmptyCategory(cat.id, cat.label)}
                        />
                    ))}
                </div>
            </section>

            {/* DB stats */}
            <section>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Banco de dados</h2>
                <div className="glass-card p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {dbItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-md bg-bg-depth/60 border border-border-default flex items-center justify-center text-text-muted shrink-0">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-text-muted truncate">{item.label}</p>
                                        <p className="font-display font-semibold text-text-primary text-base tabular-nums">
                                            {item.value.toLocaleString("pt-BR")}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Limpeza do banco */}
            <section>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Limpeza do banco</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {wipeRows.map((row) => {
                        const Icon = row.icon;
                        return (
                            <div key={row.target} className={`glass-card p-4 ${row.disabled ? "opacity-60" : ""}`}>
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-display font-semibold text-text-primary">{row.label}</h3>
                                        <p className="text-xs text-text-muted mt-1">{row.description}</p>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => onWipeDatabase(row.target, row.label)}
                                                disabled={row.disabled || actionLoading}
                                                className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Esvaziar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-text-muted mb-1">
                {icon}
                <span className="text-xs uppercase tracking-wider">{label}</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary truncate">{value}</p>
            {hint && <p className="text-xs text-text-muted mt-1 truncate">{hint}</p>}
        </div>
    );
}

function CategoryCard({
    cat,
    maxSize,
    actionLoading,
    onOpen,
    onEmpty,
}: {
    cat: CategoryAggregate;
    maxSize: number;
    actionLoading: boolean;
    onOpen: () => void;
    onEmpty: () => void;
}) {
    const Icon = CATEGORY_ICON[cat.id];
    const colors = CATEGORY_COLOR[cat.id];
    const pct = maxSize > 0 ? (cat.size / maxSize) * 100 : 0;
    const empty = cat.count === 0;

    return (
        <div className={`glass-card p-4 transition-all ${empty ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-display font-semibold text-text-primary truncate">{cat.label}</h3>
                        <span className="text-sm tabular-nums font-mono text-text-secondary shrink-0">{formatBytes(cat.size)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{cat.description}</p>

                    <div className="mt-3 h-1.5 rounded-full bg-bg-depth/60 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full ${colors.bar}`}
                        />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-text-muted">{cat.count.toLocaleString("pt-BR")} arquivo(s)</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onOpen}
                                disabled={empty}
                                className="text-xs px-2.5 py-1 rounded-md bg-bg-glass hover:bg-bg-glass-hover border border-border-default text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Ver arquivos
                            </button>
                            <button
                                onClick={onEmpty}
                                disabled={empty || actionLoading}
                                className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-3 h-3" />
                                Esvaziar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function CategoryDetail({
    categoryId,
    items,
    itemsLoading,
    nextCursor,
    totalCount,
    totalSize,
    selectedKeys,
    toggleSelect,
    toggleSelectAll,
    allSelected,
    sort,
    setSort,
    search,
    setSearch,
    actionLoading,
    onBack,
    onLoadMore,
    onDeleteSelected,
    onEmptyCategory,
}: {
    categoryId: CategoryId;
    items: StorageItem[];
    itemsLoading: boolean;
    nextCursor: number | null;
    totalCount: number;
    totalSize: number;
    selectedKeys: Set<string>;
    toggleSelect: (key: string) => void;
    toggleSelectAll: () => void;
    allSelected: boolean;
    sort: "size" | "date";
    setSort: (s: "size" | "date") => void;
    search: string;
    setSearch: (s: string) => void;
    actionLoading: boolean;
    onBack: () => void;
    onLoadMore: () => void;
    onDeleteSelected: () => void;
    onEmptyCategory: (cat: CategoryId, label: string) => void;
}) {
    const Icon = CATEGORY_ICON[categoryId];
    const colors = CATEGORY_COLOR[categoryId];
    const label =
        categoryId === "gen-images" ? "Imagens geradas"
        : categoryId === "gen-videos" ? "Vídeos gerados"
        : categoryId === "gen-attachments" ? "Anexos de geração"
        : categoryId === "chat-thumbs" ? "Anexos do Brainstorm"
        : categoryId === "video-thumbs" ? "Capas de vídeo"
        : categoryId === "brand-assets" ? "Assets de Marcas"
        : "Não categorizado";

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            {/* Sub-header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 rounded-lg bg-bg-glass hover:bg-bg-glass-hover border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div>
                        <h2 className="font-display font-bold text-text-primary">{label}</h2>
                        <p className="text-xs text-text-muted">
                            {totalCount.toLocaleString("pt-BR")} arquivo(s) · {formatBytes(totalSize)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por chave..."
                        className="h-9 px-3 rounded-lg bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 w-56"
                    />
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-depth/60 border border-border-default">
                        <button
                            onClick={() => setSort("size")}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${sort === "size" ? "bg-bg-surface text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                        >
                            <ArrowDownWideNarrow className="w-3 h-3" /> Tamanho
                        </button>
                        <button
                            onClick={() => setSort("date")}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${sort === "date" ? "bg-bg-surface text-text-primary" : "text-text-muted hover:text-text-primary"}`}
                        >
                            <ArrowDownAZ className="w-3 h-3" /> Data
                        </button>
                    </div>
                    <button
                        onClick={() => onEmptyCategory(categoryId, label)}
                        disabled={totalCount === 0 || actionLoading}
                        className="h-9 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-40"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Esvaziar categoria
                    </button>
                </div>
            </div>

            {/* Selection bar */}
            <div className="glass-card p-3 flex items-center justify-between">
                <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                    {allSelected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                    Selecionar todos ({items.length})
                </button>
                <div className="flex items-center gap-2">
                    {selectedKeys.size > 0 && (
                        <span className="text-xs text-text-muted">{selectedKeys.size} selecionado(s)</span>
                    )}
                    <button
                        onClick={onDeleteSelected}
                        disabled={selectedKeys.size === 0 || actionLoading}
                        className="px-3 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Apagar selecionados
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="glass-card overflow-hidden">
                {itemsLoading && items.length === 0 ? (
                    <div className="p-12 flex items-center justify-center text-text-muted">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando arquivos...
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center text-text-muted flex flex-col items-center gap-2">
                        <Boxes className="w-8 h-8 text-border-default" />
                        Nenhum arquivo encontrado.
                    </div>
                ) : (
                    <div className="divide-y divide-border-default">
                        {items.map((item) => {
                            const selected = selectedKeys.has(item.key);
                            const showThumb = isImageKey(item.key);
                            return (
                                <div
                                    key={item.key}
                                    className={`grid grid-cols-[auto_64px_1fr_auto_auto] gap-4 px-4 py-3 items-center transition-colors ${selected ? "bg-accent/5" : "hover:bg-bg-depth/30"}`}
                                >
                                    <button
                                        onClick={() => toggleSelect(item.key)}
                                        className="text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {selected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                                    </button>

                                    <div className="w-16 h-16 rounded-md bg-bg-depth border border-border-default overflow-hidden flex items-center justify-center text-text-muted shrink-0">
                                        {showThumb ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={previewUrl(item)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : item.key.endsWith(".mp4") ? (
                                            <Video className="w-5 h-5" />
                                        ) : (
                                            <Boxes className="w-5 h-5" />
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <p className={`text-sm font-mono truncate ${selected ? "text-accent-light" : "text-text-primary"}`} title={item.key}>
                                            {item.key}
                                        </p>
                                        <p className="text-xs text-text-muted mt-0.5">{formatDate(item.lastModified)}</p>
                                    </div>

                                    <span className="text-sm tabular-nums font-mono text-text-secondary whitespace-nowrap">
                                        {formatBytes(item.size)}
                                    </span>

                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-text-muted hover:text-accent transition-colors"
                                    >
                                        abrir
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                )}

                {nextCursor !== null && (
                    <div className="p-3 border-t border-border-default flex justify-center">
                        <button
                            onClick={onLoadMore}
                            disabled={itemsLoading}
                            className="px-4 py-2 rounded-md bg-bg-glass hover:bg-bg-glass-hover border border-border-default text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
                        >
                            {itemsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4 -rotate-90" />}
                            Carregar mais
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
