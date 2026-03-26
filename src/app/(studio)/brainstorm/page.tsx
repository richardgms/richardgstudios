"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Image as ImageIcon,
    Lightbulb,
    Layers,
    BookOpen,
    Loader2,
    ArrowLeft,
    Video,
    Palette,
    UploadCloud
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";

import { BrainstormMessage, BrainstormAttachment, ChatSession, SuggestionItem } from "@/components/brainstorm/types";
import { ChatMessage } from "@/components/brainstorm/ChatMessage";
import { ChatInput } from "@/components/brainstorm/ChatInput";
import { HistorySidebar } from "@/components/brainstorm/HistorySidebar";
import { ImageModal } from "@/components/brainstorm/ImageModal";
import { DeleteConfirmModal } from "@/components/brainstorm/DeleteConfirmModal";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { compressImageToFile } from "@/lib/image-utils";

// ─── Static Data ───────────────────────────────────
const SUGGESTIONS: SuggestionItem[] = [
    { icon: ImageIcon, title: "Produto para e-commerce", prompt: "Crie um prompt para foto profissional de um produto de skincare minimalista em fundo branco" },
    { icon: Sparkles, title: "Thumbnail YouTube", prompt: "Quero uma thumbnail épica para um vídeo sobre inteligência artificial" },
    { icon: Lightbulb, title: "Avatar profissional", prompt: "Monte um prompt para criar um avatar profissional estilo cartoon para LinkedIn" },
    { icon: Layers, title: "Post para Instagram", prompt: "Crie um prompt visual para um carrossel de Instagram sobre produtividade" },
];

const LIBRARY_SUGGESTIONS: SuggestionItem[] = [
    { icon: BookOpen, title: "Buscar avatar anime", prompt: "Procure prompts de avatar estilo anime na biblioteca" },
    { icon: BookOpen, title: "Foto de produto", prompt: "Encontre prompts de e-commerce com fundo branco para produto" },
    { icon: BookOpen, title: "Poster cinematográfico", prompt: "Busque prompts de poster estilo filme com visual dramático" },
    { icon: BookOpen, title: "Ilustrar meu artigo", prompt: "Tenho um artigo sobre startups e preciso de uma imagem de capa. Me ajude a encontrar um prompt adequado" },
];

// ─── Component ─────────────────────────────────────
export default function BrainstormPage() {
    const [messages, setMessages] = useState<BrainstormMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [model, setModel] = useState<"flash" | "pro" | "flash-3.1" | "pro-3.1">("flash");
    const [libraryMode, setLibraryMode] = useState(false);
    const activePersona = useAppStore(s => s.activePersona);
    const setActivePersona = useAppStore(s => s.setActivePersona);
    const [attachments, setAttachments] = useState<BrainstormAttachment[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [lastAddedIndex, setLastAddedIndex] = useState(-1);
    const [isDragging, setIsDragging] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const dragCounterRef = useRef(0);
    const router = useRouter();
    const setPrompt = useAppStore((s) => s.setPrompt);

    // useRef for stable callback access to changing state
    const stateRef = useRef({ messages, input, attachments, model, activeSessionId, libraryMode, loading, activePersona });
    useEffect(() => {
        stateRef.current = { messages, input, attachments, model, activeSessionId, libraryMode, loading, activePersona };
    });

    // Auto-scroll on new messages
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    // Fetch sessions when history opens
    const fetchSessions = useCallback(async () => {
        if (!activePersona) return;
        try {
            const res = await fetch(`/api/brainstorm/sessions?agent=${activePersona}`);
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions);
            }
        } catch { /* silent */ }
    }, [activePersona]);

    useEffect(() => {
        if (showHistory) fetchSessions();
    }, [showHistory, fetchSessions]);

    // Cleanup object URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            stateRef.current.attachments.forEach(att => {
                if (att.url) URL.revokeObjectURL(att.url);
            });
        };
    }, []);

    // ─── Handlers (stable via useCallback + stateRef) ───
    const handleNewChat = useCallback(() => {
        // Revoke blob URLs from current attachments
        stateRef.current.attachments.forEach(att => URL.revokeObjectURL(att.url));
        setActiveSessionId(null);
        setMessages([]);
        setAttachments([]);
        setShowHistory(false);
        setLastAddedIndex(-1);
    }, []);

    const handleBackToHub = useCallback(() => {
        setActivePersona(null);
        handleNewChat();
    }, [setActivePersona, handleNewChat]);

    const handleLoadSession = useCallback(async (id: string) => {
        setActiveSessionId(id);
        setShowHistory(false);
        setLoading(true);
        setLastAddedIndex(-1);
        try {
            const res = await fetch(`/api/brainstorm/sessions/${id}`);
            if (res.ok) {
                const data = await res.json();
                const loaded = data.messages.map((m: { role: string; content: string }) => ({
                    role: m.role === "model" ? "assistant" : m.role,
                    content: m.content
                }));
                setMessages(loaded);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    const handleDeleteSession = useCallback(async () => {
        const id = stateRef.current.activeSessionId;
        const delId = deletingId;
        if (!delId) return;
        try {
            const res = await fetch(`/api/brainstorm/sessions/${delId}`, { method: "DELETE" });
            if (res.ok) {
                setSessions(prev => prev.filter(s => s.id !== delId));
                if (id === delId) handleNewChat();
                setDeletingId(null);
            }
        } catch { /* silent */ }
    }, [deletingId, handleNewChat]);

    const processFiles = useCallback((files: File[]) => {
        if (stateRef.current.attachments.some(a => a.isUploading)) return; // Block simultaneous uploads

        files.forEach((file) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            const isPdf = file.type === "application/pdf";

            if (!isImage && !isVideo && !isPdf) {
                useAppStore.getState().addToast({
                    id: Math.random().toString(),
                    type: "error",
                    message: "Formato de arquivo não suportado",
                    description: "Apenas imagens, vídeos curtos e PDFs são permitidos."
                });
                return;
            }

            // Phase 2 - Security: Prevent SVG processing for objectURLs (XSS vector prevention)
            if (file.type === "image/svg+xml") {
                useAppStore.getState().addToast({
                    id: Math.random().toString(),
                    type: "error",
                    message: "Formato não suportado",
                    description: "Por motivos de segurança, arquivos SVG não são permitidos."
                });
                return;
            }

            // Phase 1 - Mitigation: Hard Cap of 20MB to prevent Vercel Timeout
            const MAX_SIZE_MB = 20;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                useAppStore.getState().addToast({
                    id: Math.random().toString(),
                    type: "error",
                    message: "Arquivo muito grande",
                    description: `O arquivo deve ter no máximo ${MAX_SIZE_MB}MB.`
                });
                return;
            }

            // Temp local visual representation
            const localAttId = crypto.randomUUID();

            if (isImage || isVideo || isPdf) {
                // Add placeholder immediately with local preview
                setAttachments((prev) => [
                    ...prev,
                    {
                        id: localAttId,
                        url: URL.createObjectURL(file),
                        type: file.type,
                        fileInstance: file,
                        isUploading: true,
                        name: file.name
                    },
                ]);

                // Upload via server → Google File API
                // Images > 4MB are compressed client-side to fit Vercel's 4.5MB body limit
                (async () => {
                    try {
                        let uploadFile: File = file;
                        if (isImage && file.size >= 4 * 1024 * 1024) {
                            uploadFile = await compressImageToFile(file);
                        }

                        const formData = new FormData();
                        formData.append("file", uploadFile);

                        const res = await fetch("/api/upload-gemini", {
                            method: "POST",
                            body: formData,
                        });
                        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
                        const data = await res.json();

                        setAttachments(prev => prev.map(a => a.id === localAttId ? {
                            ...a,
                            fileUri: data.fileUri,
                            name: data.name,
                            isUploading: false
                        } : a));
                    } catch (err) {
                        console.error("[Brainstorm] Upload failed:", err);
                        const fileLabel = isPdf ? 'PDF' : isVideo ? 'vídeo' : 'imagem';
                        useAppStore.getState().addToast({
                            id: Math.random().toString(),
                            type: "error",
                            message: "Erro no upload",
                            description: `Falha ao enviar ${fileLabel} "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB).`
                        });
                        removeAttachment(localAttId);
                    }
                })();
            }

        });
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        processFiles(Array.from(files));
        e.target.value = "";
    }, [processFiles]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        if (stateRef.current.attachments.some(a => a.isUploading)) return; // Block paste collision

        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (const item of items) {
            if (item.type.indexOf("image") !== -1 || item.type.indexOf("video") !== -1 || item.type === "application/pdf") {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length > 0) processFiles(files);
    }, [processFiles]);

    const removeAttachment = useCallback((id: string) => {
        setAttachments((prev) => {
            const att = prev.find(a => a.id === id);
            if (att) URL.revokeObjectURL(att.url);
            return prev.filter((a) => a.id !== id);
        });
    }, []);

    const handleStop = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    /** Consumes an NDJSON streaming response, updating the assistant message incrementally. */
    const consumeStream = useCallback(async (
        res: Response,
        baseMessages: BrainstormMessage[]
    ) => {
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accText = "";
        let resolvedSessionId: string | null = null;

        // Add empty assistant message placeholder
        const assistantIdx = baseMessages.length;
        setMessages([...baseMessages, { role: "assistant" as const, content: "" }]);
        setLastAddedIndex(assistantIdx);

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.error) {
                            accText += `\n\n❌ [Erro: ${parsed.error}]`;
                            setMessages(prev => {
                                const next = [...prev];
                                next[assistantIdx] = { role: "assistant" as const, content: accText };
                                return next;
                            });
                            return { accText, resolvedSessionId }; // Graceful degradation
                        }
                        if (parsed.done) {
                            resolvedSessionId = parsed.sessionId ?? null;
                        } else if (parsed.text) {
                            accText += parsed.text;
                            // Update message in-place
                            setMessages(prev => {
                                const next = [...prev];
                                next[assistantIdx] = { role: "assistant" as const, content: accText };
                                return next;
                            });
                        }
                    } catch { /* skip malformed lines */ }
                }
            }
        } finally {
            reader.cancel();
        }

        return { accText, resolvedSessionId };
    }, []);

    const handleSend = useCallback(async (text?: string) => {
        const state = stateRef.current;
        const msg = text || state.input.trim();
        const isUploadingAttach = state.attachments.some(a => a.isUploading);
        if ((!msg && state.attachments.length === 0) || state.loading || isUploadingAttach) return;

        const currentAttachments = [...state.attachments];
        const userMsg: BrainstormMessage = {
            role: "user",
            content: msg,
            attachments: currentAttachments.length > 0 ? currentAttachments : undefined
        };

        const updated = [...state.messages, userMsg];
        setMessages(updated);
        setLastAddedIndex(updated.length - 1);
        setInput("");
        setLoading(true);
        setAttachments([]);

        if (inputRef.current) inputRef.current.style.height = "auto";

        // Create fresh AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    messages: updated.map(m => ({
                        ...m,
                        attachments: m.attachments?.map(a => ({ ...a, base64: undefined }))
                    })),
                    model: state.model,
                    sessionId: state.activeSessionId,
                    libraryMode: state.libraryMode,
                    agent: state.activePersona,
                    attachments: currentAttachments.map(a => ({
                        type: a.type,
                        fileUri: a.fileUri,
                        name: a.name
                    }))
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                let errorMsg = `Erro do Servidor (${res.status}): Falha na comunicação técnica.`;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error) errorMsg = parsed.error;
                } catch { /* fallback to generic string */ }
                throw new Error(errorMsg);
            }

            const { resolvedSessionId } = await consumeStream(res, updated);
            if (resolvedSessionId) setActiveSessionId(resolvedSessionId);

        } catch (err) {
            // Abort is expected — don't show error message
            if (err instanceof Error && err.name === "AbortError") return;
            setMessages(prev => [
                ...prev,
                { role: "assistant" as const, content: `❌ Erro: ${err instanceof Error ? err.message : "Falha na conexão"}` }
            ]);
            useAppStore.getState().addToast({
                id: Math.random().toString(),
                type: "error",
                message: "Erro no processamento",
                description: err instanceof Error ? err.message : "Houve uma falha na sua conexão ao enviar a mensagem."
            });
            setLastAddedIndex(updated.length);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
            inputRef.current?.focus();
        }
    }, [consumeStream]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleEditMessage = useCallback(async (index: number, newContent: string) => {
        const state = stateRef.current;
        if (state.loading) return;

        const originalMsg = state.messages[index];
        if (!originalMsg || originalMsg.role !== "user") return;

        const truncated = state.messages.slice(0, index);
        const editedMsg: BrainstormMessage = {
            role: "user",
            content: newContent,
            attachments: originalMsg.attachments,
        };
        const updated = [...truncated, editedMsg];

        setMessages(updated);
        setLastAddedIndex(updated.length - 1);
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    messages: updated.map(m => ({
                        ...m,
                        attachments: m.attachments?.map(a => ({ ...a, base64: undefined }))
                    })),
                    model: state.model,
                    sessionId: state.activeSessionId,
                    libraryMode: state.libraryMode,
                    agent: state.activePersona,
                    attachments: (originalMsg.attachments || []).map(a => ({
                        base64: a.base64,
                        type: a.type,
                        fileUri: a.fileUri,
                        name: a.name
                    })),
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                let errorMsg = `Erro do Servidor (${res.status}): Falha na comunicação técnica.`;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error) errorMsg = parsed.error;
                } catch { /* fallback to generic string */ }
                throw new Error(errorMsg);
            }

            const { resolvedSessionId } = await consumeStream(res, updated);
            if (resolvedSessionId) setActiveSessionId(resolvedSessionId);

        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setMessages(prev => [
                ...prev,
                { role: "assistant" as const, content: `❌ Erro: ${err instanceof Error ? err.message : "Falha na conexão"}` }
            ]);
            useAppStore.getState().addToast({
                id: Math.random().toString(),
                type: "error",
                message: "Erro na edição",
                description: err instanceof Error ? err.message : "Houve uma falha na sua conexão ao enviar a edição."
            });
            setLastAddedIndex(updated.length);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
            inputRef.current?.focus();
        }
    }, [consumeStream]);

    const handleUseInStudio = useCallback((text: string) => {
        const match = text.match(/```[\w]*\n([\s\S]*?)```/);
        const codeBlock = match ? match[1].trim() : text;
        setPrompt(codeBlock);
        router.push("/studio");
    }, [setPrompt, router]);

    const onSetViewingImage = useCallback((url: string) => setViewingImage(url), []);
    const onCloseImage = useCallback(() => setViewingImage(null), []);
    const onModelChange = useCallback((m: "flash" | "pro" | "flash-3.1" | "pro-3.1") => setModel(m), []);
    const onLibraryToggle = useCallback(() => setLibraryMode(m => !m), []);
    const onRequestDelete = useCallback((id: string) => setDeletingId(id), []);
    const onStop = useCallback(() => handleStop(), [handleStop]);
    const onCancelDelete = useCallback(() => setDeletingId(null), []);
    const onCloseHistory = useCallback(() => setShowHistory(false), []);

    const isUploadingAttach = attachments.some(a => a.isUploading);

    // ─── Drag and Drop Handlers ───
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && dragCounterRef.current === 1) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);

        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

        // Pass the dropped files to our existing multi-file processor
        processFiles(Array.from(e.dataTransfer.files));
    }, [processFiles]);

    const isChatEmpty = messages.length === 0 && !loading;
    const vpHeight = useVisualViewport();

    // ─── Render ────────────────────────────────────────
    return (
        <div
            className="flex flex-col relative overflow-hidden"
            style={{ height: "calc(100% - var(--vvp-offset, 0px))" }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Native-looking Drag and Drop Overlay */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] pointer-events-none bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all"
                    >
                        <div className="w-[90%] max-w-2xl h-[60%] min-h-[400px] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-accent bg-bg-surface-hover/50 shadow-2xl">
                            <motion.div
                                initial={{ scale: 0.9, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 10 }}
                                className="bg-accent/10 p-6 rounded-full border border-accent/20 mb-4"
                            >
                                <UploadCloud className="w-12 h-12 text-accent-light animate-bounce" />
                            </motion.div>
                            <h2 className="text-2xl font-display font-bold text-text-primary mb-2 text-center">Solte seus arquivos aqui</h2>
                            <p className="text-sm text-text-muted text-center">Imagens, PDFs e vídeos (até 20MB) são bem-vindos</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            {activePersona !== null && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <button
                        onClick={handleBackToHub}
                        className="p-2 rounded-xl bg-bg-glass border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors shadow-sm"
                        title="Voltar ao Início"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-2 rounded-xl bg-bg-glass border border-border-default text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors shadow-sm"
                        title="Histórico de conversas"
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Messages / Home */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto pt-14">
                <AnimatePresence mode="wait">
                    {activePersona === null ? (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center justify-center h-full px-6 max-w-2xl mx-auto w-full"
                        >
                            <div className="text-center">
                                <h1 className="font-display font-bold text-4xl text-text-primary mb-3">Escolha seu Especialista</h1>
                                <p className="text-text-muted">Selecione o membro da equipe para começar seu projeto criativo.</p>
                            </div>

                            <div className="h-10" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                <motion.button
                                    onClick={() => setActivePersona("thomas")}
                                    className="glass-card group cursor-pointer text-left p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
                                    aria-label="Selecionar persona Thomas Designer"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                                        <Palette className="w-24 h-24 text-accent" />
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 border border-accent/20">
                                        <Palette className="w-6 h-6 text-accent-light" />
                                    </div>
                                    <h2 className="font-display font-bold text-lg text-text-primary mb-2 group-hover:text-accent-light transition-colors">Thomas Designer</h2>
                                    <p className="text-xs text-text-muted leading-relaxed relative z-10">Especialista em criação de imagens, design gráfico e bibliotecas de prompts visuais. Transforma suas ideias em prompts absolutos.</p>
                                </motion.button>

                                <motion.button
                                    onClick={() => setActivePersona("aurora")}
                                    className="glass-card group cursor-pointer text-left p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
                                    aria-label="Selecionar persona Aurora Vídeos"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                                        <Video className="w-24 h-24 text-accent" />
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 border border-accent/20">
                                        <Video className="w-6 h-6 text-accent-light" />
                                    </div>
                                    <h2 className="font-display font-bold text-lg text-text-primary mb-2 group-hover:text-accent-light transition-colors">Aurora Vídeos</h2>
                                    <p className="text-xs text-text-muted leading-relaxed relative z-10">Diretora audiovisual focada em retenção (R.I.T.M.O). Recebe seus takes (vídeos até 20MB) e projeta dinâmicas, cortes e legendas virais.</p>
                                </motion.button>
                            </div>
                        </motion.div>
                    ) : isChatEmpty ? (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center justify-center h-full px-6"
                        >
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/30 to-purple-500/30 border border-accent/20 text-accent-light flex items-center justify-center mx-auto mb-5">
                                    {activePersona === 'thomas' ? <Sparkles className="w-8 h-8" /> : <Video className="w-8 h-8" />}
                                </div>
                                <h1 className="font-display font-bold text-3xl text-text-primary">
                                    {libraryMode ? "📚 Biblioteca de Prompts" : (activePersona === "thomas" ? "Ideias para o Thomas" : "Laboratório da Aurora")}
                                </h1>
                                <p className="text-sm text-text-muted mt-2 max-w-md">
                                    {libraryMode
                                        ? "Busque entre 12.000+ prompts curados e receba recomendações personalizadas"
                                        : (activePersona === "thomas" ? "Descreva sua ideia e eu vou criar o prompt visual." : "Envie seu vídeo (max 20MB) e eu vou sugerir a engenharia do seu próximo reels viral.")}
                                </p>
                            </motion.div>

                            {activePersona === "thomas" && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                                    {(libraryMode ? LIBRARY_SUGGESTIONS : SUGGESTIONS).map((s, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.05 }}
                                            onClick={() => handleSend(s.prompt)}
                                            className="group flex items-start gap-3 p-4 rounded-2xl border border-border-default bg-bg-glass hover:bg-bg-glass-hover hover:border-accent/20 text-left transition-all duration-200"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-bg-surface-hover flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                                                <s.icon className="w-4 h-4 text-text-muted group-hover:text-accent-light transition-colors" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text-primary group-hover:text-accent-light transition-colors">{s.title}</p>
                                                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{s.prompt}</p>
                                            </div>
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto w-full px-6 py-6 space-y-5">
                            {messages.map((msg, i) => (
                                <ChatMessage
                                    key={i}
                                    msg={msg}
                                    index={i}
                                    isNew={i >= lastAddedIndex && lastAddedIndex >= 0}
                                    onUseInStudio={handleUseInStudio}
                                    setViewingImage={onSetViewingImage}
                                    onEdit={handleEditMessage}
                                />

                            ))}

                            {loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full shrink-0 bg-purple-500/20 flex items-center justify-center">
                                        <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                                    </div>
                                    <div className="flex items-center">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-text-muted/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-2 h-2 bg-text-muted/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-2 h-2 bg-text-muted/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals & Sidebar */}
            <HistorySidebar
                isOpen={showHistory}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onClose={onCloseHistory}
                onNewChat={handleNewChat}
                onLoadSession={handleLoadSession}
                onRequestDelete={onRequestDelete}
            />

            <DeleteConfirmModal
                isOpen={!!deletingId}
                onConfirm={handleDeleteSession}
                onCancel={onCancelDelete}
            />

            <ImageModal imageUrl={viewingImage} onClose={onCloseImage} />

            {/* Input */}
            {activePersona !== null && (
                <ChatInput
                    input={input}
                    onInputChange={setInput}
                    onSend={() => handleSend()}
                    onStop={onStop}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    loading={loading}
                    isUploadingAttach={isUploadingAttach}
                    model={model}
                    onModelChange={onModelChange}
                    libraryMode={libraryMode}
                    onLibraryToggle={onLibraryToggle}
                    activePersona={activePersona}
                    attachments={attachments}
                    onRemoveAttachment={removeAttachment}
                    onFileSelect={handleFileSelect}
                    fileInputRef={fileInputRef}
                    inputRef={inputRef}
                    isHome={isChatEmpty}
                    hasMessages={messages.length > 0}
                    onNewChat={handleNewChat}
                />
            )}
        </div>
    );
}
