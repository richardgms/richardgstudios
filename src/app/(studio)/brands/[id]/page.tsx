"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, Loader2, Save, Trash2, Upload, X, ImageIcon, AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface BrandAsset {
    id: string;
    brand_id: string;
    title: string;
    description: string | null;
    r2_key: string;
    proxy_url: string;
    sort_order: number;
}

interface BrandDetail {
    id: string;
    name: string;
    description: string | null;
    segment: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    primary_font: string | null;
    secondary_font: string | null;
    visual_style: string | null;
    tone_of_voice: string | null;
    extra_notes: string | null;
    assets: BrandAsset[];
}

const VISUAL_STYLES = ["", "minimalista", "maximalista", "moderno", "clássico", "bold"];

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-sm font-medium text-text-secondary pt-2.5 sm:text-right">
                {label}
            </label>
            <div className="sm:col-span-2">{children}</div>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1 mb-4 mt-2">
            {children}
        </p>
    );
}

// ── Asset Upload Modal ──────────────────────────────────────────────────────

interface UploadModalProps {
    brandId: string;
    onClose: () => void;
    onSaved: (asset: BrandAsset) => void;
}

function AssetUploadModal({ brandId, onClose, onSaved }: UploadModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (f: File) => {
        setFile(f);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith("image/")) handleFile(f);
    };

    const handleUpload = async () => {
        if (!title.trim() || !file || uploading) return;
        setUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("title", title.trim());
            if (description.trim()) fd.append("description", description.trim());
            fd.append("image", file);

            const res = await fetch(`/api/brands/${brandId}/assets`, { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Falha no upload");
                return;
            }
            onSaved(data as BrandAsset);
        } catch {
            setError("Erro de conexão. Tente novamente.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                className="relative glass-card w-full max-w-md p-6 space-y-4"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
            >
                <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-text-primary">Adicionar asset</p>
                    <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-glass-hover transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Drop zone */}
                <div
                    className={`border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        file ? "border-accent/40 bg-accent/5" : "border-border-default hover:border-accent/40 hover:bg-bg-glass-hover"
                    }`}
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {preview ? (
                        <Image src={preview} alt="preview" width={120} height={80} className="max-h-28 max-w-full object-contain rounded-lg" unoptimized />
                    ) : (
                        <>
                            <Upload className="w-6 h-6 text-text-muted mb-2" />
                            <p className="text-xs text-text-secondary">Clique ou arraste a imagem</p>
                            <p className="text-xs text-text-muted mt-1">PNG, JPG, WebP • será comprimida para máx. 800 KB</p>
                        </>
                    )}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título (ex: Logo principal)..."
                    className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição (opcional, ex: Usar em fundo escuro)..."
                    className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />

                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex gap-2 justify-end pt-1">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!title.trim() || !file || uploading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg transition-colors"
                    >
                        {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Salvar asset
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function BrandDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [brand, setBrand] = useState<BrandDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

    // Form state mirrors brand fields
    const [form, setForm] = useState({
        name: "",
        description: "",
        segment: "",
        primary_color: "",
        secondary_color: "",
        accent_color: "",
        primary_font: "",
        secondary_font: "",
        visual_style: "",
        tone_of_voice: "",
        extra_notes: "",
    });

    const fetchBrand = useCallback(async () => {
        try {
            const res = await fetch(`/api/brands/${id}`);
            if (!res.ok) { router.push("/brands"); return; }
            const data: BrandDetail = await res.json();
            setBrand(data);
            setForm({
                name: data.name,
                description: data.description ?? "",
                segment: data.segment ?? "",
                primary_color: data.primary_color ?? "",
                secondary_color: data.secondary_color ?? "",
                accent_color: data.accent_color ?? "",
                primary_font: data.primary_font ?? "",
                secondary_font: data.secondary_font ?? "",
                visual_style: data.visual_style ?? "",
                tone_of_voice: data.tone_of_voice ?? "",
                extra_notes: data.extra_notes ?? "",
            });
        } catch { router.push("/brands"); }
        finally { setLoading(false); }
    }, [id, router]);

    useEffect(() => { fetchBrand(); }, [fetchBrand]);

    const handleSave = async () => {
        if (!form.name.trim() || saving) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/brands/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim() || undefined,
                    description: form.description.trim() || null,
                    segment: form.segment.trim() || null,
                    primary_color: form.primary_color || null,
                    secondary_color: form.secondary_color || null,
                    accent_color: form.accent_color || null,
                    primary_font: form.primary_font.trim() || null,
                    secondary_font: form.secondary_font.trim() || null,
                    visual_style: form.visual_style || null,
                    tone_of_voice: form.tone_of_voice.trim() || null,
                    extra_notes: form.extra_notes.trim() || null,
                }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                if (brand) setBrand({ ...brand, ...form });
            }
        } catch { /* silent */ }
        finally { setSaving(false); }
    };

    const handleDeleteAsset = async (assetId: string) => {
        try {
            const res = await fetch(`/api/brands/${id}/assets/${assetId}`, { method: "DELETE" });
            if (res.ok) {
                setBrand((prev) => prev ? { ...prev, assets: prev.assets.filter((a) => a.id !== assetId) } : prev);
                setDeletingAssetId(null);
            }
        } catch { /* silent */ }
    };

    const inputClass = "w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus";
    const colorInputClass = "h-9 w-14 rounded-lg border border-border-default cursor-pointer bg-transparent p-0.5";

    if (loading) {
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Carregando marca...</p>
                </div>
            </div>
        );
    }

    if (!brand) return null;

    return (
        <>
            <AnimatePresence>
                {showUpload && (
                    <AssetUploadModal
                        brandId={id}
                        onClose={() => setShowUpload(false)}
                        onSaved={(asset) => {
                            setBrand((prev) => prev ? { ...prev, assets: [...prev.assets, asset] } : prev);
                            setShowUpload(false);
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="p-8 max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/brands"
                            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-glass-hover transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div className="min-w-0">
                            <p className="text-xs text-text-muted">Marcas</p>
                            <h1 className="font-display font-bold text-xl text-text-primary truncate">{brand.name}</h1>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-xl transition-all shrink-0"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saved ? "Salvo!" : "Salvar"}
                    </button>
                </div>

                {/* Form card */}
                <div className="glass-card p-6 space-y-6">

                    {/* ── Informações gerais ── */}
                    <SectionTitle>Informações Gerais</SectionTitle>
                    <div className="space-y-4">
                        <FieldRow label="Nome *">
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Nome da marca..."
                                className={inputClass}
                            />
                        </FieldRow>
                        <FieldRow label="Segmento">
                            <input
                                type="text"
                                value={form.segment}
                                onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                                placeholder="ex: Joalheria"
                                className={inputClass}
                            />
                        </FieldRow>
                        <FieldRow label="Descrição">
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Descrição curta da marca..."
                                rows={2}
                                className={`${inputClass} resize-none`}
                            />
                        </FieldRow>
                    </div>

                    <div className="border-t border-border-default" />

                    {/* ── Identidade visual ── */}
                    <SectionTitle>Identidade Visual</SectionTitle>
                    <div className="space-y-4">
                        <FieldRow label="Cor primária">
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.primary_color || "#6366f1"}
                                    onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                                    className={colorInputClass}
                                />
                                <input
                                    type="text"
                                    value={form.primary_color}
                                    onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                                    placeholder="#rrggbb"
                                    maxLength={7}
                                    className="flex-1 px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                                />
                            </div>
                        </FieldRow>
                        <FieldRow label="Cor secundária">
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.secondary_color || "#6366f1"}
                                    onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                                    className={colorInputClass}
                                />
                                <input
                                    type="text"
                                    value={form.secondary_color}
                                    onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                                    placeholder="#rrggbb"
                                    maxLength={7}
                                    className="flex-1 px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                                />
                            </div>
                        </FieldRow>
                        <FieldRow label="Cor de destaque">
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.accent_color || "#6366f1"}
                                    onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
                                    className={colorInputClass}
                                />
                                <input
                                    type="text"
                                    value={form.accent_color}
                                    onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
                                    placeholder="#rrggbb"
                                    maxLength={7}
                                    className="flex-1 px-4 py-2.5 bg-bg-glass border border-border-default rounded-xl text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                                />
                            </div>
                        </FieldRow>
                        <FieldRow label="Fonte principal">
                            <input
                                type="text"
                                value={form.primary_font}
                                onChange={(e) => setForm((f) => ({ ...f, primary_font: e.target.value }))}
                                placeholder="ex: Cormorant Garamond"
                                className={inputClass}
                            />
                        </FieldRow>
                        <FieldRow label="Fonte secundária">
                            <input
                                type="text"
                                value={form.secondary_font}
                                onChange={(e) => setForm((f) => ({ ...f, secondary_font: e.target.value }))}
                                placeholder="ex: Montserrat"
                                className={inputClass}
                            />
                        </FieldRow>
                        <FieldRow label="Estilo visual">
                            <select
                                value={form.visual_style}
                                onChange={(e) => setForm((f) => ({ ...f, visual_style: e.target.value }))}
                                className={`${inputClass} appearance-none`}
                            >
                                {VISUAL_STYLES.map((s) => (
                                    <option key={s} value={s} className="bg-bg-surface">
                                        {s || "Selecionar..."}
                                    </option>
                                ))}
                            </select>
                        </FieldRow>
                        <FieldRow label="Tom de voz">
                            <input
                                type="text"
                                value={form.tone_of_voice}
                                onChange={(e) => setForm((f) => ({ ...f, tone_of_voice: e.target.value }))}
                                placeholder="ex: elegante e sofisticado"
                                className={inputClass}
                            />
                        </FieldRow>
                        <FieldRow label="Regras extras">
                            <textarea
                                value={form.extra_notes}
                                onChange={(e) => setForm((f) => ({ ...f, extra_notes: e.target.value }))}
                                placeholder="Regras adicionais de identidade visual, restrições de uso, orientações de composição..."
                                rows={3}
                                className={`${inputClass} resize-none`}
                            />
                        </FieldRow>
                    </div>
                </div>

                {/* ── Assets ── */}
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <SectionTitle>Assets da Marca</SectionTitle>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/10 transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Adicionar asset
                        </button>
                    </div>

                    {brand.assets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border-default">
                            <ImageIcon className="w-8 h-8 text-text-muted/30 mb-2" />
                            <p className="text-sm text-text-secondary">Nenhum asset cadastrado</p>
                            <button
                                onClick={() => setShowUpload(true)}
                                className="mt-2 text-xs text-accent hover:underline"
                            >
                                → Adicionar assets
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <AnimatePresence mode="popLayout">
                                {brand.assets.map((asset) => (
                                    <motion.div
                                        key={asset.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="group relative rounded-xl overflow-hidden border border-border-default bg-bg-glass"
                                    >
                                        {/* Confirm delete overlay */}
                                        <AnimatePresence>
                                            {deletingAssetId === asset.id && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 z-10 bg-bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-2"
                                                >
                                                    <p className="text-xs text-text-primary text-center">Remover asset?</p>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => setDeletingAssetId(null)}
                                                            className="px-2.5 py-1 text-xs text-text-secondary border border-border-default rounded-lg hover:bg-bg-glass-hover transition-colors"
                                                        >
                                                            Não
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAsset(asset.id)}
                                                            className="px-2.5 py-1 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg hover:bg-red-400/20 transition-colors"
                                                        >
                                                            Sim
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Thumbnail */}
                                        <div className="h-24 bg-bg-glass overflow-hidden">
                                            <Image
                                                src={asset.proxy_url}
                                                alt={asset.title}
                                                width={200}
                                                height={96}
                                                className="w-full h-full object-contain p-1"
                                                unoptimized
                                            />
                                        </div>

                                        {/* Label */}
                                        <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                                            <p className="text-xs text-text-secondary truncate">{asset.title}</p>
                                            <button
                                                onClick={() => setDeletingAssetId(asset.id)}
                                                className="p-1 text-text-muted hover:text-red-400 rounded hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {asset.description && (
                                            <p className="px-2 pb-1.5 text-xs text-text-muted truncate">{asset.description}</p>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
