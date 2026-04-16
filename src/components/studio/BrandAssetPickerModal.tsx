"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ImageIcon, ChevronDown } from "lucide-react";
import Image from "next/image";
import { compressImage } from "@/lib/image-utils";

interface BrandOption {
    id: string;
    name: string;
    primary_color: string | null;
    segment: string | null;
}

interface AssetOption {
    id: string;
    title: string;
    description: string | null;
    proxy_url: string;
}

interface BrandAssetPickerModalProps {
    onClose: () => void;
    onSelect: (base64: string) => void;
}

function BrandAvatar({ name, color }: { name: string; color?: string | null }) {
    const initials = name.slice(0, 2).toUpperCase();
    return (
        <span
            className="inline-flex items-center justify-center rounded-md font-bold text-white text-[10px] select-none shrink-0"
            style={{ width: 18, height: 18, backgroundColor: color || "#6366f1" }}
        >
            {initials}
        </span>
    );
}

export function BrandAssetPickerModal({ onClose, onSelect }: BrandAssetPickerModalProps) {
    const [brands, setBrands] = useState<BrandOption[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>("");
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);

    // Fetch brands on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/brands");
                if (res.ok) {
                    const data = await res.json();
                    const list: BrandOption[] = data.brands ?? [];
                    setBrands(list);
                    if (list.length > 0) setSelectedBrandId(list[0].id);
                }
            } catch { /* silent */ }
            finally { setLoadingBrands(false); }
        })();
    }, []);

    // Fetch assets when brand changes
    useEffect(() => {
        if (!selectedBrandId) { setAssets([]); return; }
        setLoadingAssets(true);
        (async () => {
            try {
                const res = await fetch(`/api/brands/${selectedBrandId}`);
                if (res.ok) {
                    const data = await res.json();
                    setAssets(data.assets ?? []);
                }
            } catch { /* silent */ }
            finally { setLoadingAssets(false); }
        })();
    }, [selectedBrandId]);

    const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? null;

    const handleAssetClick = async (asset: AssetOption) => {
        if (loadingAssetId) return;
        setLoadingAssetId(asset.id);
        try {
            const res = await fetch(asset.proxy_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const mimeType = res.headers.get("content-type") || blob.type || "image/webp";
            const file = new File([blob], `${asset.title}.webp`, { type: mimeType });
            const base64 = await compressImage(file, 1024, 0.7);
            onSelect(base64);
        } catch (err) {
            console.error("[BrandAssetPicker] Failed to load asset:", err);
        } finally {
            setLoadingAssetId(null);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                className="relative glass-card w-full max-w-md p-5 space-y-4 shadow-2xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">Inserir asset de marca</p>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-glass-hover transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Brand dropdown */}
                {loadingBrands ? (
                    <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Carregando marcas...
                    </div>
                ) : brands.length === 0 ? (
                    <div className="text-xs text-text-muted py-2">
                        Nenhuma marca cadastrada.{" "}
                        <a href="/brands" className="text-accent hover:underline">Criar marca →</a>
                    </div>
                ) : (
                    <div className="relative">
                        <button
                            onClick={() => setShowBrandDropdown((v) => !v)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-bg-glass border border-border-default rounded-xl text-sm text-left hover:bg-bg-glass-hover transition-colors"
                        >
                            {selectedBrand && (
                                <BrandAvatar name={selectedBrand.name} color={selectedBrand.primary_color} />
                            )}
                            <span className="flex-1 text-text-primary truncate">
                                {selectedBrand?.name ?? "Selecionar marca"}
                            </span>
                            <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                        </button>

                        <AnimatePresence>
                            {showBrandDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full left-0 right-0 mt-1 glass-card py-1 z-10 shadow-xl"
                                >
                                    {brands.map((b) => (
                                        <button
                                            key={b.id}
                                            onClick={() => { setSelectedBrandId(b.id); setShowBrandDropdown(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-colors text-left"
                                        >
                                            <BrandAvatar name={b.name} color={b.primary_color} />
                                            <span className="truncate">{b.name}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Asset grid */}
                {selectedBrandId && (
                    <div>
                        {loadingAssets ? (
                            <div className="flex items-center gap-2 text-xs text-text-muted py-4 justify-center">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Carregando assets...
                            </div>
                        ) : assets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <ImageIcon className="w-8 h-8 text-text-muted/30 mb-2" />
                                <p className="text-xs text-text-secondary">Nenhum asset cadastrado</p>
                                <a href={`/brands/${selectedBrandId}`} className="text-xs text-accent hover:underline mt-1">
                                    → Adicionar assets
                                </a>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {assets.map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => handleAssetClick(asset)}
                                        disabled={!!loadingAssetId}
                                        className="group relative rounded-xl overflow-hidden border border-border-default bg-bg-glass hover:border-accent/40 hover:bg-accent/5 transition-colors aspect-square flex flex-col"
                                        title={asset.description ?? asset.title}
                                    >
                                        {loadingAssetId === asset.id ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                            </div>
                                        ) : (
                                            <Image
                                                src={asset.proxy_url}
                                                alt={asset.title}
                                                fill
                                                unoptimized
                                                className="object-contain p-1"
                                                sizes="120px"
                                            />
                                        )}
                                        <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] text-text-secondary bg-black/60 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                            {asset.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Cancel */}
                <div className="flex justify-end pt-1">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
