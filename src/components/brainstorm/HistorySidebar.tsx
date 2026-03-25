"use client";

import { memo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trash2, Search, SearchX, X, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ChatSession } from "./types";

interface HistorySidebarProps {
    isOpen: boolean;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onClose: () => void;
    onNewChat: () => void;
    onLoadSession: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

function HistorySidebarInner({
    isOpen,
    sessions,
    activeSessionId,
    onClose,
    onNewChat,
    onLoadSession,
    onRequestDelete,
}: HistorySidebarProps) {
    const activePersona = useAppStore(s => s.activePersona) || "thomas";
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ChatSession[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [isOpen]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (query.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/brainstorm/sessions/search?q=${encodeURIComponent(query)}&agent=${activePersona}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.sessions || []);
                }
            } catch (err) {
                console.error("Search error", err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const displaySessions = searchQuery.length >= 2 ? searchResults : sessions;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-y-0 left-0 z-[65] w-80 bg-bg-surface border-r border-border-default shadow-2xl flex flex-col"
                    >
                        <div className="p-4 border-b border-border-default flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-display font-bold text-lg text-text-primary">Histórico</h2>
                                <button onClick={onNewChat} className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-glass-hover rounded-lg transition-colors">
                                    <Sparkles className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Search Input */}
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors focus-within:text-accent-light" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Buscar nas conversas..."
                                    className="w-full bg-bg-surface-hover/50 border border-border-default rounded-lg pl-9 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 placeholder:text-text-muted transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => handleSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-bg-glass transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {isSearching ? (
                                <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-3 animate-pulse">
                                    <Loader2 className="w-5 h-5 animate-spin text-accent-light" />
                                    <p className="text-xs">Buscando...</p>
                                </div>
                            ) : displaySessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-2">
                                    {searchQuery.length >= 2 ? (
                                        <>
                                            <SearchX className="w-6 h-6 stroke-[1.5] mb-1" />
                                            <p className="text-xs">Nenhuma conversa encontrada.</p>
                                        </>
                                    ) : (
                                        <p className="text-xs">Nenhuma conversa salva.</p>
                                    )}
                                </div>
                            ) : (
                                displaySessions.map(session => (
                                    <SearchItem
                                        key={session.id}
                                        session={session}
                                        isActive={activeSessionId === session.id}
                                        onLoad={() => onLoadSession(session.id)}
                                        onDelete={() => onRequestDelete(session.id)}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Sub-componente memoizado para evitar re-renders massivos durante busca (react-patterns)
const SearchItem = memo(({ session, isActive, onLoad, onDelete }: {
    session: ChatSession,
    isActive: boolean,
    onLoad: () => void,
    onDelete: () => void
}) => (
    <div
        onClick={onLoad}
        className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${isActive
                ? "bg-accent/10 border-accent/30 shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]"
                : "bg-bg-glass border-border-default/50 hover:border-border-default hover:bg-bg-glass-hover"
            }`}
    >
        <div className={`mt-1 p-2 rounded-lg ${isActive ? "bg-accent text-white" : "bg-bg-surface-soft text-text-muted"}`}>
            <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isActive ? "text-accent-light" : "text-text-primary"}`}>
                {session.name}
            </p>
            {session.snippet ? (
                <p
                    className="text-[11px] text-text-muted mt-1.5 line-clamp-2 leading-relaxed break-words"
                    dangerouslySetInnerHTML={{ __html: session.snippet }}
                />
            ) : (
                <p className="text-[10px] text-text-muted mt-0.5">
                    {new Date(session.updated_at).toLocaleDateString("pt-BR")}
                </p>
            )}
        </div>
        <button
            onClick={(e) => {
                e.stopPropagation();
                onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-2"
        >
            <Trash2 className="w-3.5 h-3.5" />
        </button>
    </div>
));

SearchItem.displayName = "SearchItem";

export const HistorySidebar = memo(HistorySidebarInner);
