"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Plus, Trash2, Loader2, ImageIcon, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface BrandItem {
    id: string;
    name: string;
    description: string | null;
    segment: string | null;
    thumbnail: string | null;
    asset_count: number;
    primary_color: string | null;
}

function BrandInitials({ name, color }: { name: string; color?: string | null }) {
    const initials = name.slice(0, 2).toUpperCase();
    const bg = color || "#6366f1";
    return (
        <div
            className="w-full h-full flex items-center justify-center text-white font-bold text-xl select-none"
            style={{ backgroundColor: bg }}
        >
            {initials}
        </div>
    );
}

export default function BrandsPage() {
    const router = useRouter();
    const [brands, setBrands] = useState<BrandItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newSegment, setNewSegment] = useState("");
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchBrands = useCallback(async () => {
        try {
            const res = await fetch("/api/brands");
            if (res.ok) {
                const data = await res.json();
                setBrands(data.brands);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchBrands(); }, [fetchBrands]);

    const handleCreate = async () => {
        if (!newName.trim() || creating) return;
        setCreating(true);
        try {
            const res = await fetch("/api/brands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim(), segment: newSegment.trim() || undefined }),
            });
            if (res.ok) {
                const data = await res.json();
                setNewName("");
                setNewSegment("");
                setShowCreate(false);
                router.push(`/brands/${data.id}`);
            }
        } catch { /* silent */ }
        finally { setCreating(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDeletingId(null);
                setBrands((prev) => prev.filter((b) => b.id !== id));
            }
        } catch { /* silent */ }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <h1 className="font-display font-bold text-2xl text-text-primary mb-6">Marcas</h1>
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Carregando marcas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl text-text-primary">Marcas</h1>
                <div className="flex items-center gap-3">
                    {brands.length > 0 && (
                        <span className="text-xs text-text-muted bg-bg-glass border border-border-default px-3 py-1.5 rounded-full">
                            {brands.length} {brands.length === 1 ? "marca" : "marcas"}
                        </span>
                    )}
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nova marca
                    </button>
                </div>
            </div>

            {/* Create form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-card p-4 space-y-3">
                            <p className="text-sm font-medium text-text-primary">Nova marca</p>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                placeholder="Nome da marca..."
                                className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                                autoFocus
                            />
                            <input
                                type="text"
                                value={newSegment}
                                onChange={(e) => setNewSegment(e.target.value)}
                                placeholder="Segmento (ex: Joalheria)..."
                                className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => { setShowCreate(false); setNewName(""); setNewSegment(""); }}
                                    className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || creating}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg transition-colors"
                                >
                                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Criar e configurar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Brand grid */}
            {brands.length === 0 && !showCreate ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 glass-card"
                >
                    <Tag className="w-12 h-12 text-text-muted/30 mb-3" />
                    <p className="text-sm text-text-secondary">Nenhuma marca ainda</p>
                    <p className="text-xs text-text-muted mt-1">
                        Crie uma marca para enriquecer seus chats automaticamente
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {brands.map((brand) => (
                            <motion.div
                                key={brand.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="glass-card overflow-hidden group relative"
                            >
                                {/* Confirm delete overlay */}
                                <AnimatePresence>
                                    {deletingId === brand.id && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 z-10 bg-bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4"
                                        >
                                            <p className="text-sm text-text-primary text-center font-medium">
                                                Remover &ldquo;{brand.name}&rdquo;?
                                            </p>
                                            <p className="text-xs text-text-muted text-center">
                                                Sessões existentes não serão afetadas
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setDeletingId(null)}
                                                    className="px-3 py-1.5 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(brand.id)}
                                                    className="px-3 py-1.5 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Thumbnail */}
                                <div className="h-28 bg-bg-glass overflow-hidden">
                                    {brand.thumbnail ? (
                                        <Image
                                            src={brand.thumbnail}
                                            alt={brand.name}
                                            width={400}
                                            height={112}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <BrandInitials name={brand.name} color={brand.primary_color} />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-text-primary truncate">{brand.name}</p>
                                        {brand.segment && (
                                            <p className="text-xs text-text-muted mt-0.5">{brand.segment}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <ImageIcon className="w-3 h-3 text-text-muted" />
                                            <span className="text-xs text-text-muted">
                                                {brand.asset_count} {brand.asset_count === 1 ? "asset" : "assets"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                        <button
                                            onClick={() => setDeletingId(brand.id)}
                                            className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remover marca"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <Link
                                            href={`/brands/${brand.id}`}
                                            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-glass-hover transition-colors"
                                            title="Configurar marca"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
