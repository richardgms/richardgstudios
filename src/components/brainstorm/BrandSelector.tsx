"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Lock, AlertTriangle, ChevronDown } from "lucide-react";

export interface BrandOption {
    id: string;
    name: string;
    segment: string | null;
    primary_color: string | null;
    thumbnail: string | null;
}

interface BrandSelectorProps {
    /** Currently selected brand (null = none) */
    selectedBrand: BrandOption | null;
    /** True after the first message is sent — brand is locked for this session */
    locked: boolean;
    /** True if the brand was deleted after the session was created */
    brandDeleted?: boolean;
    onSelect: (brand: BrandOption | null) => void;
}

function BrandAvatar({ name, color, size = 18 }: { name: string; color?: string | null; size?: number }) {
    const initials = name.slice(0, 2).toUpperCase();
    const bg = color || "#6366f1";
    return (
        <span
            className="inline-flex items-center justify-center rounded-md font-bold text-white shrink-0 select-none"
            style={{ width: size, height: size, fontSize: size * 0.42, backgroundColor: bg }}
        >
            {initials}
        </span>
    );
}

export function BrandSelector({ selectedBrand, locked, brandDeleted = false, onSelect }: BrandSelectorProps) {
    const [brands, setBrands] = useState<BrandOption[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const fetchBrands = async () => {
        if (loading || brands.length > 0) return;
        setLoading(true);
        try {
            const res = await fetch("/api/brands");
            if (res.ok) {
                const data = await res.json();
                setBrands(data.brands ?? []);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleOpen = () => {
        if (locked) return;
        fetchBrands();
        setOpen(true);
    };

    // ── State: brand deleted ──────────────────────────────────────────
    if (brandDeleted) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Marca removida</span>
            </div>
        );
    }

    // ── State: locked chip ────────────────────────────────────────────
    if (locked && selectedBrand) {
        return (
            <div
                className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-glass border border-border-default text-xs text-text-secondary cursor-default select-none"
                title="Marca definida no início da sessão. Para trocar, inicie um novo chat."
            >
                <BrandAvatar name={selectedBrand.name} color={selectedBrand.primary_color} size={16} />
                <span className="max-w-[100px] truncate text-text-primary">{selectedBrand.name}</span>
                <Lock className="w-2.5 h-2.5 text-text-muted" />
                {/* Tooltip */}
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 rounded-lg bg-bg-surface border border-border-default p-2 text-xs text-text-secondary text-center shadow-lg z-50">
                    Marca definida no início da sessão. Para trocar, inicie um novo chat.
                </span>
            </div>
        );
    }

    // ── State: brand selected, not locked ─────────────────────────────
    if (selectedBrand) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/25 text-xs">
                <BrandAvatar name={selectedBrand.name} color={selectedBrand.primary_color} size={16} />
                <span className="max-w-[100px] truncate text-accent-light font-medium">{selectedBrand.name}</span>
                <button
                    onClick={() => onSelect(null)}
                    className="text-text-muted hover:text-text-primary transition-colors ml-0.5"
                    title="Remover marca"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        );
    }

    // ── State: no brand selected — dropdown trigger ───────────────────
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-glass border border-border-default text-xs text-text-muted hover:text-text-secondary hover:border-border-focus transition-colors"
            >
                <Tag className="w-3 h-3" />
                <span className="hidden sm:inline">Selecionar marca</span>
                <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 mt-1.5 w-56 glass-card py-1 z-50 shadow-xl"
                    >
                        {loading && (
                            <div className="px-3 py-2 text-xs text-text-muted">Carregando marcas...</div>
                        )}

                        {!loading && brands.length === 0 && (
                            <div className="px-3 py-2 text-xs text-text-muted">
                                Nenhuma marca cadastrada.{" "}
                                <a href="/brands" className="text-accent hover:underline">Criar marca →</a>
                            </div>
                        )}

                        {brands.map((brand) => (
                            <button
                                key={brand.id}
                                onClick={() => { onSelect(brand); setOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-colors text-left"
                            >
                                <BrandAvatar name={brand.name} color={brand.primary_color} size={20} />
                                <div className="min-w-0">
                                    <p className="font-medium text-text-primary truncate">{brand.name}</p>
                                    {brand.segment && <p className="text-text-muted truncate">{brand.segment}</p>}
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
