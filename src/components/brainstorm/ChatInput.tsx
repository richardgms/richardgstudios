"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Square,
    Zap,
    Diamond,
    Sparkles,
    BookOpen,
    Paperclip,
    X,
    Video,
    Palette,
    Loader2,
    FileText
} from "lucide-react";
import { BrainstormAttachment } from "./types";

interface ChatInputProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onPaste: (e: React.ClipboardEvent) => void;
    loading: boolean;
    isUploadingAttach?: boolean;
    model: "flash" | "pro" | "flash-3.1" | "pro-3.1";
    onModelChange: (model: "flash" | "pro" | "flash-3.1" | "pro-3.1") => void;
    libraryMode: boolean;
    onLibraryToggle: () => void;
    activePersona: "thomas" | "aurora";
    attachments: BrainstormAttachment[];
    onRemoveAttachment: (id: string) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    isHome: boolean;
    hasMessages: boolean;
    onNewChat: () => void;
}

function ChatInputInner({
    input,
    onInputChange,
    onSend,
    onStop,
    onKeyDown,
    onPaste,
    loading,
    isUploadingAttach,
    model,
    onModelChange,
    libraryMode,
    onLibraryToggle,
    activePersona,
    attachments,
    onRemoveAttachment,
    onFileSelect,
    fileInputRef,
    inputRef,
    isHome,
    hasMessages,
    onNewChat,
}: ChatInputProps) {
    const [showModelMenu, setShowModelMenu] = useState(false);
    const canSend = (input.trim() || attachments.length > 0) && !loading && !isUploadingAttach;

    return (
        <div className="shrink-0 px-4 pb-5 pt-2">
            <div className={`mx-auto w-full transition-all duration-300 ${isHome ? "max-w-2xl" : "max-w-3xl"}`}>

                {/* Attachment Previews */}
                <AnimatePresence>
                    {attachments.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: 6, height: 0 }}
                            className="flex gap-2 overflow-x-auto mb-2 px-1"
                        >
                            {attachments.map((att) => (
                                <div key={att.id} className="relative group w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-border-default bg-bg-surface-hover">
                                    {att.url ? (
                                        att.type?.startsWith("video/") ? (
                                            <>
                                                <video
                                                    src={`${att.url}#t=0.001`}
                                                    className="w-full h-full object-cover"
                                                    preload="metadata"
                                                    muted
                                                    playsInline
                                                />
                                                <div className="absolute top-1 left-1 bg-black/60 rounded-sm inline-flex p-0.5">
                                                    <Video className="w-3 h-3 text-white" />
                                                </div>
                                            </>
                                        ) : att.type === "application/pdf" ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-bg-surface-hover text-text-muted relative">
                                                <FileText className="w-5 h-5 mb-0.5" />
                                                <span className="text-[8px] font-bold">PDF</span>
                                            </div>
                                        ) : (
                                            <img src={att.url} alt="anexo" className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {att.type?.startsWith("video/") ? (
                                                <Video className="w-5 h-5 text-text-muted" />
                                            ) : att.type === "application/pdf" ? (
                                                <FileText className="w-5 h-5 text-text-muted" />
                                            ) : (
                                                <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => onRemoveAttachment(att.id)}
                                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remover anexo"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main input container */}
                <div className="relative bg-bg-glass border border-border-default rounded-2xl focus-within:border-border-focus focus-within:ring-1 focus-within:ring-accent/20 transition-all shadow-sm">
                    {/* Visual Loading Overlay over Input */}
                    <AnimatePresence>
                        {isUploadingAttach && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-10 bg-bg-glass/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center border border-accent/20"
                            >
                                <Loader2 className="w-5 h-5 text-accent-light animate-spin mb-1.5" />
                                <span className="text-xs font-medium text-text-primary">Enviando arquivo para a Aurora...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Textarea — full width, no right padding override */}
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        onPaste={onPaste}
                        disabled={loading || isUploadingAttach}
                        placeholder="Descreva a imagem que quer criar..."
                        rows={1}
                        className="w-full px-4 pt-3.5 pb-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
                        style={{ minHeight: "48px", maxHeight: "150px" }}
                        onInput={(e) => {
                            const t = e.target as HTMLTextAreaElement;
                            t.style.height = "auto";
                            t.style.height = Math.min(t.scrollHeight, 150) + "px";
                        }}
                    />

                    {/* Toolbar row — below textarea, never overlaps text */}
                    <div className="flex items-center justify-between px-3 pb-2.5">
                        {/* Left: secondary actions */}
                        <div className="flex items-center gap-0.5">
                            {/* Attach */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileSelect}
                                className="hidden"
                                accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf"
                                multiple
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || isUploadingAttach}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-11 min-w-11"
                                title="Adicionar imagem"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>

                            {/* Library toggle */}
                            <button
                                onClick={onLibraryToggle}
                                disabled={loading || isUploadingAttach}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${libraryMode
                                    ? "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
                                    }`}
                                title={libraryMode ? "Biblioteca ativa — clique para desativar" : "Ativar busca na biblioteca de 12.000+ prompts"}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Biblioteca</span>
                            </button>

                            {/* Custom Model Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowModelMenu(!showModelMenu)}
                                    disabled={loading || isUploadingAttach}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all backdrop-blur-md border border-white/5 hover:bg-white/5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${model === "flash" ? "text-amber-400 bg-amber-500/5" :
                                        model === "pro" ? "text-purple-400 bg-purple-500/5" :
                                            model === "flash-3.1" ? "text-cyan-400 bg-cyan-500/5" :
                                                "text-pink-400 bg-pink-500/5"
                                        }`}
                                >
                                    {model === "flash" ? <Zap className="w-3.5 h-3.5" /> :
                                        model === "pro" ? <Diamond className="w-3.5 h-3.5" /> :
                                            model === "flash-3.1" ? <Zap className="w-3.5 h-3.5 fill-current" /> :
                                                <Sparkles className="w-3.5 h-3.5" />}
                                    <span>{
                                        model === "flash" ? "Flash 2.5" :
                                            model === "pro" ? "Pro 2.5" :
                                                model === "flash-3.1" ? "Flash 3.1" :
                                                    "Pro 3.1"
                                    }</span>
                                    <svg className={`w-3 h-3 transition-transform duration-200 ${showModelMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                <AnimatePresence>
                                    {showModelMenu && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setShowModelMenu(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-2 w-48 bg-bg-glass/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl z-30"
                                            >
                                                {[
                                                    { id: "flash", label: "Flash 2.5", sub: "Velocidade total", color: "text-amber-400", bg: "hover:bg-amber-400/10", icon: <Zap className="w-4 h-4" /> },
                                                    { id: "pro", label: "Pro 2.5", sub: "Raciocínio denso", color: "text-purple-400", bg: "hover:bg-purple-400/10", icon: <Diamond className="w-4 h-4" /> },
                                                    { id: "flash-3.1", label: "Flash 3.1", sub: "Agêntico & Rápido", color: "text-cyan-400", bg: "hover:bg-cyan-400/10", icon: <Zap className="w-4 h-4 fill-current" /> },
                                                    { id: "pro-3.1", label: "Pro 3.1", sub: "Padrão Industrial", color: "text-pink-400", bg: "hover:bg-pink-400/10", icon: <Sparkles className="w-4 h-4" /> }
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            onModelChange(opt.id as any);
                                                            setShowModelMenu(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${opt.bg} group`}
                                                    >
                                                        <div className={`${opt.color} bg-white/5 p-1.5 rounded-lg group-hover:bg-white/10 transition-colors`}>
                                                            {opt.icon}
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className={`text-[12px] font-bold ${opt.color}`}>{opt.label}</span>
                                                            <span className="text-[10px] text-text-muted">{opt.sub}</span>
                                                        </div>
                                                        {model === opt.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Persona Indicator */}
                            <div className="flex items-center gap-1 px-2 py-1 ml-1 rounded-lg text-[11px] font-medium border bg-accent/10 border-accent/20 text-accent-light" title={`Conversando com ${activePersona === "thomas" ? "Thomas Designer" : "Aurora Vídeos"}`}>
                                {activePersona === "thomas" ? <Palette className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                                <span>{activePersona === "thomas" ? "Thomas" : "Aurora"}</span>
                            </div>
                        </div>

                        {/* Right: send / stop */}
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.button
                                    key="stop"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={onStop}
                                    className="flex items-center justify-center p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 transition-all min-h-11 min-w-11"
                                    title="Parar geração"
                                >
                                    <Square className="w-4 h-4 fill-current" />
                                </motion.button>
                            ) : (
                                <motion.button
                                    key="send"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={onSend}
                                    disabled={!canSend}
                                    className="flex items-center justify-center p-2 rounded-xl bg-text-primary text-bg-root hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all min-h-11 min-w-11"
                                    title="Enviar (Enter)"
                                >
                                    <Send className="w-4 h-4 ml-0.5" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between mt-1.5 px-1">
                    <p className="text-[10px] text-text-muted/60">
                        {loading
                            ? <span className="text-red-400/70">Gerando… clique no quadrado para parar</span>
                            : <>
                                {libraryMode && <><BookOpen className="w-3 h-3 inline mr-1" />Biblioteca ativa · </>}
                                {model === "flash" && <><Zap className="w-3 h-3 inline mr-0.5" />Flash 2.5</>}
                                {model === "pro" && <><Diamond className="w-3 h-3 inline mr-0.5" />Pro 2.5</>}
                                {model === "flash-3.1" && <>🚀 Flash 3.1</>}
                                {model === "pro-3.1" && <>🧠 Pro 3.1</>}
                                {" · "}Enter envia · Shift+Enter nova linha
                            </>
                        }
                    </p>
                    {hasMessages && !loading && (
                        <button
                            onClick={onNewChat}
                            className="flex items-center gap-1 text-[10px] text-text-muted/60 hover:text-accent-light transition-colors"
                        >
                            <Sparkles className="w-3 h-3" />
                            Nova conversa
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export const ChatInput = memo(ChatInputInner);
