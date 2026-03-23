'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePromptCategoryStore, PromptBasicInfo } from '@/store/promptCategoryStore';
import { X, Search, Plus, Trash2, Tag, Loader2, Link2Off, AlertCircle } from 'lucide-react';

export function PromptCategoryModal() {
    const store = usePromptCategoryStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [allPrompts, setAllPrompts] = useState<PromptBasicInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [localLoading, setLocalLoading] = useState<Record<string, boolean>>({});
    const [toastMessage, setToastMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

    const showToast = (text: string, type: 'error' | 'success' = 'error') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Fechar no Esc
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && store.isOpen) {
                store.closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [store]);

    // Busca prompts disponíveis quando o modal abre (para não depender da digitação)
    useEffect(() => {
        if (!store.isOpen) {
            setAllPrompts([]);
            setSearchQuery('');
            return;
        }

        let isMounted = true;
        const fetchPrompts = async () => {
            setIsSearching(true);
            try {
                const res = await fetch('/api/promptsave/prompts');
                if (!res.ok) throw new Error('Falha ao buscar');
                const data = await res.json();
                if (isMounted) {
                    // Guardar da biblioteca GERAL apenas os prompts que NÃO possuem nenhuma categoria
                    const available = data.prompts
                        .filter((p: any) => !p.folderId && !p.isDeleted)
                        .map((p: any) => ({
                            id: p.id,
                            title: p.title,
                            folderId: p.folderId,
                            contentSnippet: p.content?.substring(0, 100)
                        }));
                    setAllPrompts(available);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setIsSearching(false);
            }
        };

        fetchPrompts();
        return () => { isMounted = false; };
    }, [store.isOpen, store.activeCategoryId]);

    // Computed property sem debounce pra ser instântaneo
    const availablePrompts = allPrompts.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!store.isOpen) return null;

    const handleAdd = async (prompt: PromptBasicInfo) => {
        setLocalLoading(prev => ({ ...prev, [prompt.id]: true }));
        // Optimistic: remover da lista de disponíveis
        setAllPrompts(prev => prev.filter(p => p.id !== prompt.id));

        // Disparar Action
        const res = await store.addPrompt(prompt);
        setLocalLoading(prev => ({ ...prev, [prompt.id]: false }));

        if (res.error) {
            // Rollback visual
            setAllPrompts(prev => [...prev, prompt]);
            showToast(res.error, 'error');
        } else {
            showToast("Prompt vinculado com sucesso!", 'success');
        }
    };

    const handleRemove = async (promptId: string) => {
        const removedPrompt = store.prompts.find(p => p.id === promptId);

        setLocalLoading(prev => ({ ...prev, [promptId]: true }));
        const res = await store.removePrompt(promptId);
        setLocalLoading(prev => ({ ...prev, [promptId]: false }));

        if (res.error) {
            showToast(res.error, 'error');
        } else {
            // Adicionar devolta na lista de allPrompts 
            if (removedPrompt) {
                setAllPrompts(prev => [...prev, { ...removedPrompt, folderId: null }]);
            }
            showToast("Prompt desvinculado com sucesso!", 'success');
        }
    };

    return (
        <AnimatePresence>
            {store.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={store.closeModal}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden relative z-10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-[#27272a] bg-[#18181b]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[#fafafa]">
                                        {store.activeCategoryName}
                                    </h2>
                                    <p className="text-sm text-[#71717a]">
                                        Gerencie os prompts vinculados a esta categoria
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={store.closeModal}
                                className="p-2 text-[#71717a] hover:text-[#fafafa] hover:bg-[#27272a]/50 rounded-lg transition-colors"
                                title="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Search Add Bar */}
                            <div className="p-5 border-b border-[#27272a] bg-[#18181b]">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
                                    <input
                                        type="text"
                                        placeholder="Pesquise prompts na biblioteca para adicionar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-sm text-[#fafafa] placeholder-[#71717a] focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/40 focus:outline-none transition-all shadow-sm"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                                    )}
                                </div>

                                {/* Available Prompts Dropdown / List */}
                                <AnimatePresence>
                                    {isSearchFocused || searchQuery ? (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 overflow-y-auto max-h-40 bg-white/5 rounded-xl border border-white/5"
                                        >
                                            {availablePrompts.length === 0 && !isSearching ? (
                                                <div className="p-4 text-sm text-[#71717a] text-center">Nenhum prompt disponível encontrado na biblioteca.</div>
                                            ) : (
                                                <ul className="flex flex-col">
                                                    {availablePrompts.map(prompt => (
                                                        <li key={prompt.id} className={`flex justify-between items-center p-3 border-b border-white/5 last:border-0 transition-colors group ${localLoading[prompt.id] ? 'opacity-50 bg-[#27272a]/50' : 'hover:bg-[#27272a]/50'}`}>
                                                            <span className="text-sm font-medium text-[#fafafa] line-clamp-1">{prompt.title}</span>
                                                            <button
                                                                onClick={() => handleAdd(prompt)}
                                                                disabled={localLoading[prompt.id]}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                            >
                                                                {localLoading[prompt.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                                Adicionar
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>

                            {/* Linked Prompts List */}
                            <div className="flex-1 overflow-y-auto p-5 bg-[#18181b]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
                                        Prompts Vinculados ({store.prompts.length})
                                    </h3>
                                </div>

                                {/* Fallbacks */}
                                {store.isLoading && store.prompts.length === 0 ? (
                                    // Skeleton State
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-14 bg-white/5 animate-pulse rounded-xl border border-white/5" />
                                        ))}
                                    </div>
                                ) : store.prompts.length === 0 ? (
                                    // Empty State
                                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-[#27272a] rounded-2xl bg-white/5">
                                        <Link2Off className="w-10 h-10 text-[#71717a] mb-3" />
                                        <h4 className="text-sm font-display font-semibold text-[#fafafa] mb-1">Lista Vazia</h4>
                                        <p className="text-[#a1a1aa] text-[11px] max-w-[250px] leading-relaxed">
                                            Nenhum prompt vinculado a esta categoria ainda. Selecione acima para adicionar.
                                        </p>
                                    </div>
                                ) : (
                                    // Data List (Safe Rendering - pure text binding via standard React {node})
                                    <ul className="flex flex-col gap-2.5">
                                        <AnimatePresence>
                                            {store.prompts.map((prompt) => (
                                                <motion.li
                                                    key={prompt.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className={`flex items-center justify-between p-3.5 bg-white/5 border rounded-xl group transition-colors ${localLoading[prompt.id] ? 'border-red-500/50 opacity-70' : 'border-white/5 hover:border-emerald-500/30'}`}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${localLoading[prompt.id] ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                        <span className="text-sm font-medium text-[#fafafa] truncate max-w-[300px]">
                                                            {prompt.title}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemove(prompt.id)}
                                                        disabled={localLoading[prompt.id]}
                                                        className="p-2 text-[#71717a] hover:text-red-400 hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                                                        title="Desvincular da categoria"
                                                    >
                                                        {localLoading[prompt.id] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </motion.li>
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Toast Notification Layers */}
                        <AnimatePresence>
                            {toastMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 border px-5 py-3 rounded-full shadow-2xl backdrop-blur-md ${toastMessage.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-200 shadow-red-900/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-emerald-900/20'}`}
                                >
                                    {toastMessage.type === 'error' ? <AlertCircle size={16} className="text-red-400" /> : <Loader2 size={16} className="text-emerald-400 hidden" />}
                                    <span className="text-sm font-medium tracking-wide">{toastMessage.text}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
