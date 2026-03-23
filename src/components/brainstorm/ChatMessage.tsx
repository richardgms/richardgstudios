"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Pencil, Send, X, FileBadge, Video, FileText } from "lucide-react";
import { BrainstormMessage } from "./types";
import { MessageRenderer } from "./MessageRenderer";

interface ChatMessageProps {
    msg: BrainstormMessage;
    index: number;
    isNew: boolean;
    onUseInStudio: (text: string) => void;
    setViewingImage: (url: string) => void;
    onEdit?: (index: number, newContent: string) => void;
}

function ChatMessageInner({ msg, index, isNew, onUseInStudio, setViewingImage, onEdit }: ChatMessageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(msg.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus and auto-resize textarea when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            adjustHeight(textareaRef.current);
        }
    }, [isEditing]);

    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    const handleStartEdit = useCallback(() => {
        setEditText(msg.content);
        setIsEditing(true);
    }, [msg.content]);

    const handleCancelEdit = useCallback(() => {
        setEditText(msg.content);
        setIsEditing(false);
    }, [msg.content]);

    const handleSubmitEdit = useCallback(() => {
        const trimmed = editText.trim();
        if (!trimmed || !onEdit) return;
        setIsEditing(false);
        onEdit(index, trimmed);
    }, [editText, onEdit, index]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitEdit();
        }
        if (e.key === "Escape") {
            handleCancelEdit();
        }
    }, [handleSubmitEdit, handleCancelEdit]);

    const isUserMessage = msg.role === "user";

    return (
        <motion.div
            initial={isNew ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 group"
        >
            {/* Avatar */}
            <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === "user"
                    ? "bg-accent/20 text-accent-light"
                    : "bg-purple-500/20 text-purple-300"
                    }`}
            >
                {msg.role === "user" ? "V" : "AI"}
            </div>

            <div className="flex-1 min-w-0">
                {/* Header row: label + edit button */}
                <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-xs font-medium text-text-muted">
                        {msg.role === "user" ? "Você" : "Engenheiro de Prompts"}
                    </p>

                    {/* Edit button — only for user messages, only when not editing */}
                    {isUserMessage && !isEditing && onEdit && (
                        <button
                            onClick={handleStartEdit}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-bg-glass-hover text-text-muted hover:text-text-primary"
                            title="Editar mensagem"
                            aria-label="Editar mensagem"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Attachment Previews — always visible, even during edit */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto py-1">
                        {msg.attachments.map((att) => {
                            const isVideo = att.type?.startsWith("video/");
                            const isPdf = att.type === "application/pdf";

                            return (
                                <div key={att.id} className="relative w-48 h-32 rounded-xl overflow-hidden border border-border-default bg-bg-surface-hover shrink-0 cursor-pointer hover:border-accent/30 transition-colors flex items-center justify-center">
                                    {isVideo ? (
                                        <>
                                            <video
                                                src={`${att.url}#t=0.001`}
                                                className="w-full h-full object-cover"
                                                preload="metadata"
                                                controls={false} // Minimalist look since it's just a thumbnail
                                                muted playsInline
                                            />
                                            {/* Video Indicator Overlay */}
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5">
                                                <Video className="w-3 h-3 text-white" />
                                                <span className="text-[10px] font-medium text-white uppercase">{att.type.split('/')[1] || 'VIDEO'}</span>
                                            </div>
                                        </>
                                    ) : isPdf ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-bg-glass text-text-muted relative pt-2">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                                                <FileText className="w-5 h-5 text-accent-light" />
                                            </div>
                                            <span className="text-xs font-medium text-text-primary px-3 text-center truncate w-full" title={att.name || "Documento PDF"}>
                                                {att.name || "Documento PDF"}
                                            </span>
                                        </div>
                                    ) : (
                                        <img
                                            src={att.url}
                                            alt="anexo"
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Content: either edit mode or display mode */}
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={editText}
                            onChange={(e) => {
                                setEditText(e.target.value);
                                adjustHeight(e.target);
                            }}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            className="w-full resize-none rounded-xl border border-accent/40 bg-bg-glass px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/30 transition-all overflow-hidden"
                            placeholder="Edite sua mensagem..."
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSubmitEdit}
                                disabled={!editText.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/20 text-accent-light hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <Send className="w-3 h-3" />
                                Enviar
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-all"
                            >
                                <X className="w-3 h-3" />
                                Cancelar
                            </button>
                            <span className="text-xs text-text-muted/60">Enter para enviar · Esc para cancelar</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm w-full">
                        <MessageRenderer content={msg.content} setViewingImage={setViewingImage} onUseInStudio={isUserMessage ? undefined : onUseInStudio} />
                    </div>
                )}

                {/* No footer button — "Usar no Studio" now lives inside each code block */}
            </div>
        </motion.div>
    );
}

export const ChatMessage = memo(ChatMessageInner);
