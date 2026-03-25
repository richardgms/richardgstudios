"use client";

import { useState, useEffect } from "react";
import { Trash2, RefreshCw, AlertTriangle, CheckSquare, Square, MessageSquare, Image as ImageIcon, Briefcase, LayoutGrid, FileText, FolderArchive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TrashType = "chat" | "image" | "project" | "session";

interface TrashItem {
    id: string;
    type: TrashType;
    deleted_at: string;
    name?: string;
    prompt?: string;
    description?: string;
    image_path?: string;
    url?: string;
}

export default function TrashPage() {
    const [activeTab, setActiveTab] = useState<"sessions" | "files">("sessions");
    const [items, setItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTrash = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/trash");
            if (res.ok) {
                const data = await res.json();
                const chats = Array.isArray(data.chats) ? data.chats.map((c: any) => ({ ...c, type: "chat" })) : [];
                const images = Array.isArray(data.images) ? data.images.map((i: any) => ({ ...i, type: "image" })) : [];
                const projects = Array.isArray(data.projects) ? data.projects.map((p: any) => ({ ...p, type: "project" })) : [];
                const sessions = Array.isArray(data.sessions) ? data.sessions.map((s: any) => ({ ...s, type: "session" })) : [];

                const combined = [...chats, ...images, ...projects, ...sessions];
                setItems(combined);
            }
        } catch (error) {
            console.error("Failed to fetch trash:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    const getCategory = (type: TrashType): "sessions" | "files" => {
        if (type === "image") return "files";
        return "sessions";
    };

    const filteredItems = items.filter(item => getCategory(item.type) === activeTab);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set(selectedIds);
            filteredItems.forEach(item => newSet.add(item.id));
            setSelectedIds(newSet);
        }
    };

    const handleRestore = async () => {
        if (selectedIds.size === 0) return;
        setActionLoading(true);
        try {
            const types: TrashType[] = ["chat", "image", "project", "session"];
            for (const type of types) {
                const ids = Array.from(selectedIds).filter(id => items.find(i => i.id === id)?.type === type);
                if (ids.length > 0) {
                    await fetch("/api/trash/restore", {
                        method: "POST",
                        body: JSON.stringify({ type, ids })
                    });
                }
            }
            await fetchTrash();
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Restore failed", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteForever = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm("Tem certeza? Esta ação não pode ser desfeita e os arquivos serão removidos permanentemente.")) return;

        setActionLoading(true);
        try {
            const types: TrashType[] = ["chat", "image", "project", "session"];
            for (const type of types) {
                const ids = Array.from(selectedIds).filter(id => items.find(i => i.id === id)?.type === type);
                if (ids.length > 0) {
                    await fetch("/api/trash", {
                        method: "DELETE",
                        body: JSON.stringify({ type, ids })
                    });
                }
            }
            await fetchTrash();
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEmptyTrash = async () => {
        if (!confirm("Isso apagará TUDO na lixeira permanentemente. Tem certeza absoluta?")) return;
        setActionLoading(true);
        try {
            await fetch("/api/trash", {
                method: "DELETE",
                body: JSON.stringify({ all: true })
            });
            await fetchTrash();
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Empty trash failed", error);
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-bg-surface overflow-hidden relative">
            {/* Header */}
            <header className="h-16 border-b border-border-default flex items-center justify-between px-6 shrink-0 bg-bg-surface/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg text-text-primary">Lixeira</h1>
                        <p className="text-xs text-text-muted">Recupere itens ou exclua permanentemente</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleEmptyTrash}
                        className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition-colors flex items-center gap-2"
                        disabled={items.length === 0 || actionLoading}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Esvaziar Lixeira
                    </button>
                </div>
            </header>

            {/* Tabs & Filters */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-depth/50 border border-border-default">
                    <button
                        onClick={() => setActiveTab("sessions")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "sessions"
                                ? "bg-bg-surface text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary"
                            }`}
                    >
                        <FolderArchive className="w-3.5 h-3.5" />
                        Sessões ({items.filter(i => getCategory(i.type) === "sessions").length})
                    </button>
                    <button
                        onClick={() => setActiveTab("files")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "files"
                                ? "bg-bg-surface text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary"
                            }`}
                    >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Arquivos ({items.filter(i => getCategory(i.type) === "files").length})
                    </button>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                        <span className="text-sm text-text-muted mr-2">{selectedIds.size} selecionado(s)</span>
                        <button
                            onClick={handleRestore}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Restaurar
                        </button>
                        <button
                            onClick={handleDeleteForever}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                        </button>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="glass-card overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 border-b border-border-default bg-bg-depth/30 text-xs font-medium text-text-muted uppercase tracking-wider">
                        <div className="flex items-center">
                            <button onClick={toggleSelectAll} className="hover:text-text-primary transition-colors">
                                {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                                    <CheckSquare className="w-4 h-4 text-accent" />
                                ) : (
                                    <Square className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <div>Nome / Prompt</div>
                        <div>Tipo</div>
                        <div className="text-right">Deletado em</div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-text-muted animate-pulse">Carregando itens...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center gap-3">
                            <Trash2 className="w-8 h-8 text-border-default" />
                            <p className="text-text-muted">Esta categoria está vazia</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-default">
                            <AnimatePresence>
                                {filteredItems.map((item) => {
                                    const isSelected = selectedIds.has(item.id);
                                    let icon = <MessageSquare className="w-4 h-4" />;
                                    let colorClass = "bg-purple-500/10 text-purple-400";
                                    let typeLabel = "Conversa";

                                    if (item.type === "image") {
                                        icon = <ImageIcon className="w-4 h-4" />;
                                        colorClass = "bg-blue-500/10 text-blue-400";
                                        typeLabel = "Imagem";
                                    } else if (item.type === "project") {
                                        icon = <Briefcase className="w-4 h-4" />;
                                        colorClass = "bg-orange-500/10 text-orange-400";
                                        typeLabel = "Projeto";
                                    } else if (item.type === "session") {
                                        icon = <LayoutGrid className="w-4 h-4" />;
                                        colorClass = "bg-green-500/10 text-green-400";
                                        typeLabel = "Histórico Studio";
                                    } else {
                                        // Chat
                                        typeLabel = "Chat Brainstorm";
                                    }

                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 items-center group transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-bg-depth/30"
                                                }`}
                                        >
                                            <button onClick={() => toggleSelection(item.id)} className="text-text-muted hover:text-text-primary">
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-accent" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${colorClass}`}>
                                                        {icon}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-accent-light' : 'text-text-primary'}`}>
                                                            {item.name || item.prompt || "Item sem título"}
                                                        </p>
                                                        {item.type === 'image' && (
                                                            <p className="text-xs text-text-muted truncate mt-0.5">{item.image_path?.split('/').pop()}</p>
                                                        )}
                                                        {item.type === 'project' && item.description && (
                                                            <p className="text-xs text-text-muted truncate mt-0.5">{item.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-text-muted uppercase tracking-wider font-medium">
                                                {typeLabel}
                                            </div>

                                            <div className="text-xs text-text-muted tabular-nums whitespace-nowrap">
                                                {new Date(item.deleted_at).toLocaleDateString()}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
