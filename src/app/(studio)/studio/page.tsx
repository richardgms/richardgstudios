"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, Layers, AlertCircle, Maximize2, X, Plus, Check, Loader2, History, Play, Trash2, AlertTriangle, Image as ImageIcon, Video, BoxSelect, Star,
    FolderOpen, Zap, Diamond, ChevronDown, Ban, Pencil, Film, Eraser, Square, Wand2, Timer, MinusCircle,
    Mic, Upload, Volume2, Download
} from "lucide-react";

import { useAppStore } from "@/lib/store";
import { compressImage } from "@/lib/image-utils";
import { useVideoPolling } from "@/hooks/useVideoPolling";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getMaxAttachments, type ModelId } from "@/lib/model-config";
import { ImageSlotGrid } from "@/components/ImageSlotGrid";
import { ImageDetailModal, type GenerationDetail } from "@/components/ImageDetailModal";
import { UISelect } from "@/components/UISelect";
import { toImageUrl } from "@/lib/image-url";

const StudioGeneratingIcon = dynamic(
    () => import("@/components/ui/svg-animations/StudioGeneratingIcon").then(mod => mod.StudioGeneratingIcon),
    { ssr: false, loading: () => <Loader2 className="w-8 h-8 text-accent animate-spin" /> }
);

const StudioEmptyState = dynamic(
    () => import("@/components/ui/svg-animations/StudioEmptyState").then(mod => mod.StudioEmptyState),
    { ssr: false, loading: () => <div className="w-[120px] h-[120px] rounded-full bg-border-default/20 animate-pulse" /> }
);

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "A4"];
const THINKING_LEVELS = ["MINIMAL", "LOW", "MEDIUM", "HIGH"] as const;

// Mapeamento de aspect ratio â†’ classe Tailwind para os skeletons de geraÃ§Ã£o
const ASPECT_CLASS: Record<string, string> = {
    "1:1":   "aspect-square",
    "16:9":  "aspect-video",
    "9:16":  "aspect-[9/16]",
    "4:3":   "aspect-[4/3]",
    "3:4":   "aspect-[3/4]",
    "A4":    "aspect-[210/297]",
};

const MODEL_RESOLUTIONS: Record<string, Record<string, string[]>> = {
    flash: {
        "1:1": ["1024×1024"],
        "16:9": ["1376×768"],
        "9:16": ["768×1376"],
        "4:3": ["1200×896"],
        "3:4": ["896×1200"],
        "A4": ["2480×3508 (A4)"],
    },
    pro: {
        "1:1": ["4096×4096 (4K)", "2048×2048 (2K)", "1024×1024 (1K)"],
        "16:9": ["5504×3072 (4K)", "2752×1536 (2K)", "1376×768 (1K)"],
        "9:16": ["3072×5504 (4K)", "1536×2752 (2K)", "768×1376 (1K)"],
        "4:3": ["4800×3584 (4K)", "2400×1792 (2K)", "1200×896 (1K)"],
        "3:4": ["3584×4800 (4K)", "1792×2400 (2K)", "896×1200 (1K)"],
        "A4": ["2480×3508 (A4)"],
    },
    imagen: {
        "1:1": ["2048×2048 (2K)", "1024×1024 (1K)"],
        "16:9": ["2752×1536 (2K)", "1376×768 (1K)"],
        "9:16": ["1536×2752 (2K)", "768×1376 (1K)"],
        "4:3": ["2400×1792 (2K)", "1200×896 (1K)"],
        "3:4": ["1792×2400 (2K)", "896×1200 (1K)"],
        "A4": ["2480×3508 (A4)"],
    },
    "veo-3.1": {
        "16:9": ["1080p", "720p"],
        "9:16": ["1080p", "720p"],
        "1:1": ["1080p", "720p"],
    },
    "veo-3.1-fast": {
        "16:9": ["1080p", "720p"],
        "9:16": ["1080p", "720p"],
        "1:1": ["1080p", "720p"],
    },
    "veo-3.1-lite": {
        "16:9": ["1080p", "720p"],
        "9:16": ["1080p", "720p"],
    }
};

interface SessionItem {
    id: string;
    name: string;
    image_count: number;
}
interface ProjectItem {
    id: string;
    name: string;
}

interface SessionGeneration {
    id: string;
    prompt: string;
    model: string;
    imageUrl: string;
    previewUrl: string;
    created_at: string;
    is_favorite?: boolean;
    aspectRatio?: string;
    resolution?: string;
    mediaType?: 'image' | 'video';
    status?: string;
    attachments?: string | null;
    metadata?: string | null;
}

export default function StudioPage() {
    const {
        currentPrompt,
        lastPrompt,
        setPrompt,
        selectedModel,
        setModel,
        aspectRatio,
        setAspectRatio,
        thinkingLevel,
        setThinkingLevel,
        isGenerating,
        incrementGenerating,
        decrementGenerating,
        activeSessionId,
        activeSessionName,
        setActiveSession,
        activeProjectId,
        activeProjectName,
        setActiveProject,
        attachments,
        attachmentMetadata,
        setSlot,
        getFilledAttachments,
        restoreSession,
        clearAttachments,
    } = useAppStore();

    // 7.1 â€” Restaurar Ãºltimo prompt da sessÃ£o anterior (sobrevive a refresh)
    useEffect(() => {
        if (hasRestoredInitialPromptRef.current) return;
        hasRestoredInitialPromptRef.current = true;
        if (!currentPrompt && lastPrompt) {
            setPrompt(lastPrompt);
        }
    }, [currentPrompt, lastPrompt, setPrompt]);

    const [result, setResult] = useState<string | null>(null);
    const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
    const [isFavorited, setIsFavorited] = useState(false);

    // Using block-scoped states instead of duplicate declarations
    const [error, setError] = useState<string | null>(null);
    const [mediaMode, setMediaMode] = useState<'image' | 'video' | 'audio'>('image');

    // ── TTS State ──
    const [ttsText, setTtsText] = useState("");
    const [ttsVoiceFile, setTtsVoiceFile] = useState<File | null>(null);
    const [ttsIsDragging, setTtsIsDragging] = useState(false);
    const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
    const [ttsIsGenerating, setTtsIsGenerating] = useState(false);
    const [ttsError, setTtsError] = useState<string | null>(null);
    const ttsAudioRef = useRef<HTMLAudioElement>(null);
    const ttsFileInputRef = useRef<HTMLInputElement>(null);
    const ttsCHARS_MAX = 2000;
    const TTS_TAGS = [
        { tag: "[laugh]", emoji: "😄" },
        { tag: "[chuckle]", emoji: "😏" },
        { tag: "[cough]", emoji: "🤧" },
        { tag: "[sigh]", emoji: "😮\u200d💨" },
        { tag: "[gasp]", emoji: "😲" },
        { tag: "[hmm]", emoji: "🤔" },
    ] as const;

    // Multi-select state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasRestoredInitialPromptRef = useRef(false);
    const ttsTextareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const abortControllersRef = useRef<AbortController[]>([]);
    const [pendingSlots, setPendingSlots] = useState<{ id: string; status: 'loading' | 'error'; error?: string }[]>([]);

    // Video Polling Hook
    const videoPolling = useVideoPolling();

    // Sincronizar Polling Hook com Estado Global UI
    useEffect(() => {
        if (videoPolling.status === 'completed') {
            setResult(videoPolling.imageUrl || null);
            setLastGenerationId(videoPolling.generationId || null);
            fetchSessionImages();
        } else if (videoPolling.status === 'failed') {
            setError(videoPolling.error || "Erro na geração de vídeo");
        }
    }, [videoPolling.status, videoPolling.imageUrl, videoPolling.generationId, videoPolling.error]); // eslint-disable-line react-hooks/exhaustive-deps

    // Session & Project state
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [sessionImages, setSessionImages] = useState<SessionGeneration[]>([]);
    const [showSessionMenu, setShowSessionMenu] = useState(false);
    const [showProjectMenu, setShowProjectMenu] = useState(false);
    const [newSessionName, setNewSessionName] = useState("");

    // Modal state
    const [selectedImage, setSelectedImage] = useState<SessionGeneration | null>(null);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const [sessionToRename, setSessionToRename] = useState<SessionItem | null>(null);
    const [renameName, setRenameName] = useState("");
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [selectedResolution, setSelectedResolution] = useState<string>("");
    const [generationCount, setGenerationCount] = useState<number>(1);

    // Video-specific options
    const [videoDuration, setVideoDuration] = useState<number>(8);
    const [videoNegativePrompt, setVideoNegativePrompt] = useState("");
    const [showNegativePrompt, setShowNegativePrompt] = useState(false);

    // Enhance prompt modal
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhanceModalOpen, setEnhanceModalOpen] = useState(false);
    const [enhancedPromptDraft, setEnhancedPromptDraft] = useState("");

    // SSR Safe localStorage hydration
    useEffect(() => {
        const saved = localStorage.getItem('studio:generationCount');
        if (saved) {
            const val = parseInt(saved, 10);
            if ([1, 2, 4].includes(val)) {
                setGenerationCount(val);
            }
        }
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (generationCount !== 1) {
            localStorage.setItem('studio:generationCount', generationCount.toString());
        } else {
            localStorage.removeItem('studio:generationCount');
        }
    }, [generationCount]);

    const handleEnhancePrompt = useCallback(async () => {
        if (!currentPrompt.trim() || isEnhancing) return;
        setIsEnhancing(true);
        try {
            const res = await fetch("/api/videos/enhance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: currentPrompt }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao melhorar prompt");
            setEnhancedPromptDraft(data.enhanced || currentPrompt);
            setEnhanceModalOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao melhorar prompt");
        } finally {
            setIsEnhancing(false);
        }
    }, [currentPrompt, isEnhancing]);

    const processPastedFiles = useCallback(async (files: File[]) => {
        setUploadError(null);
        if (!files || files.length === 0) return;

        const maxSlots = getMaxAttachments(selectedModel);
        if (maxSlots === 0) {
            setUploadError(`${selectedModel} não suporta imagens.`);
            return;
        }

        const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

        for (const file of files) {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                setUploadError(`Formato não suportado: ${file.name}.`);
                continue;
            }
            // The instruction provided a snippet that was syntactically incorrect and out of place.
            // It seems to have intended to modify the file size check.
            // Reverting to original logic for file size check as the provided snippet was malformed.
            if (file.size > MAX_FILE_SIZE) {
                setUploadError(`Arquivo muito grande: ${file.name}. Limite de 10MB.`);
                continue;
            }

            let emptySlotIndex = -1;
            for (let i = 1; i <= maxSlots; i++) {
                if (!attachments[i]) {
                    emptySlotIndex = i;
                    break;
                }
            }

            if (emptySlotIndex === -1) {
                setUploadError(`Todos os ${maxSlots} slots estão ocupados.`);
                break;
            }

            try {
                const base64 = await compressImage(file, 1024, 0.7);
                setSlot(emptySlotIndex, base64);
            } catch (err) {
                console.error("Compression error", err);
                setUploadError("Erro ao processar imagem.");
            }
        }
    }, [attachments, selectedModel, setSlot]);

    // Handle Paste (Ctrl+V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                    const file = items[i].getAsFile();
                    if (file) imageFiles.push(file);
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault(); // Prevent default paste if we found images
                processPastedFiles(imageFiles);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [processPastedFiles]);

    // Fetch sessions & projects
    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions);
            }
        } catch { /* silent */ }
    }, []);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch { /* silent */ }
    }, []);

    // Fetch session images
    const fetchSessionImages = useCallback(async () => {
        if (!activeSessionId) {
            setSessionImages([]);
            return;
        }
        try {
            const res = await fetch(`/api/sessions/${activeSessionId}?limit=10`);
            if (res.ok) {
                const data = await res.json() as {
                    generations?: Array<{
                        id: string;
                        prompt: string;
                        model: string;
                        image_path: string;
                        created_at: string;
                        is_favorite?: boolean;
                        aspect_ratio?: string | null;
                        resolution?: string | null;
                        media_type?: "image" | "video" | null;
                        status?: string | null;
                        attachments?: string | null;
                        metadata?: string | null;
                    }>;
                };
                setSessionImages((data.generations ?? []).map((g) => ({
                    id: g.id,
                    prompt: g.prompt,
                    model: g.model,
                    imageUrl: toImageUrl(g.image_path),
                    // Thumbnail optimization: serve a capped preview in the grid,
                    // while the detail modal keeps the full-resolution asset.
                    previewUrl: toImageUrl(g.image_path, { w: 384, q: 68 }),
                    created_at: g.created_at,
                    is_favorite: !!g.is_favorite,
                    aspectRatio: g.aspect_ratio || "1:1",
                    resolution: g.resolution ?? undefined,
                    mediaType: g.media_type || 'image',
                    status: g.status || 'completed',
                    attachments: g.attachments || null,
                    metadata: g.metadata || null,
                })));
            }
        } catch { /* silent */ }
    }, [activeSessionId]);

    useEffect(() => { fetchSessions(); fetchProjects(); }, [fetchSessions, fetchProjects]);
    useEffect(() => { fetchSessionImages(); }, [fetchSessionImages]);

    const handleCreateSession = async () => {
        if (!newSessionName.trim()) return;
        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSessionName }),
            });
            if (res.ok) {
                const data = await res.json();
                setActiveSession(data.id, data.name);
                fetchSessions();
                setNewSessionName("");
                setShowSessionMenu(false);
            }
        } catch { /* silent */ }
    };

    const handleGenerate = async () => {
        if (!currentPrompt.trim()) return;
        if (!activeSessionId) {
            // Create default session if none active
            try {
                const res = await fetch("/api/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: `Sessão ${new Date().toLocaleString("pt-BR")}` }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setActiveSession(data.id, data.name);
                    // UX optimization: use new session immediately
                    await performGeneration(data.id, activeProjectId);
                    return;
                }
                // Session creation failed — parse error if available
                let errMsg = "Erro ao criar sessão. Tente novamente.";
                try {
                    const body = await res.json();
                    if (body?.error) errMsg = body.error;
                } catch { /* ignore parse error */ }
                setError(errMsg);
            } catch (err: unknown) {
                const msg = err instanceof TypeError && err.message.toLowerCase().includes("fetch")
                    ? "Sem conexão com o servidor."
                    : "Erro ao criar sessão. Tente novamente.";
                setError(msg);
            }
            return;
        }
        await performGeneration(activeSessionId, activeProjectId);
    };

    const performGeneration = async (sessionId: string, projectId: string | null) => {
        setError(null);
        setResult(null);
        setLastGenerationId(null);
        setIsFavorited(false);

        // Cancelar a execução anterior como proteção.
        abortControllersRef.current.forEach(c => c.abort());
        abortControllersRef.current = [];

        if (mediaMode === 'video') {
            incrementGenerating();
            await videoPolling.startPolling(
                currentPrompt,
                selectedModel,
                aspectRatio,
                projectId || undefined,
                sessionId,
                getFilledAttachments(),
                selectedResolution,
                videoDuration,
                videoNegativePrompt || undefined
            );
            decrementGenerating();
            return;
        }

        // --- IMAGE FAN-OUT LOGIC ---
        const count = generationCount;
        const slots = Array.from({ length: count }, () => ({
            id: Math.random().toString(36).substring(7),
            status: 'loading' as const
        }));

        setPendingSlots(slots);
        
        const generationPromises = slots.map(async (slot) => {
            const controller = new AbortController();
            abortControllersRef.current.push(controller);
            incrementGenerating();
            // 7.3 â€” Timeout estendido para 5 min devido a imagens de altíssima resolução
            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, 300_000); // 5 minutos

            try {
                const res = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: currentPrompt,
                        model: selectedModel,
                        aspectRatio: aspectRatio,
                        resolution: selectedResolution,
                        sessionId: sessionId,
                        projectId: projectId,
                        attachments: selectedModel === "imagen" ? [] : getFilledAttachments(),
                        thinkingLevel,
                        metadata: JSON.stringify({ attachments: attachmentMetadata })
                    }),
                    signal: controller.signal
                });

                // 7.4 â€” Rate limit: countdown regressivo
                if (res.status === 429) {
                    const headerVal = res.headers.get("Retry-After");
                    const seconds = headerVal ? parseInt(headerVal, 10) : 60;
                    setError(`Rate limit atingido — tente em ${seconds}s`);
                    throw new Error("rate_limit");
                }

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Erro na geração");

                // Success! Remove placeholder immediately
                setPendingSlots(prev => prev.filter(p => p.id !== slot.id));

                // Set last result only for display placeholder if it's the last one or single one
                if (count === 1) {
                    setResult(data.url);
                    setLastGenerationId(data.id);
                }

                // Refresh gallery
                fetchSessionImages();

                return data;
            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error("Erro na geração");
                if (error.name === 'AbortError') {
                    if (timedOut) {
                        // 7.3 â€” Timeout de rede
                        const msg = "Tempo limite excedido (5m). A geração levou tempo demais.";
                        setPendingSlots(prev => prev.map(p =>
                            p.id === slot.id ? { ...p, status: 'error' as const, error: msg } : p
                        ));
                        setError(msg);
                    } else {
                        // Cancelamento pelo usuário
                        setPendingSlots(prev => prev.filter(p => p.id !== slot.id));
                    }
                } else if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
                    // 7.3 â€” Sem conexão
                    const msg = "Sem conexão com o servidor. Verifique sua rede.";
                    setPendingSlots(prev => prev.map(p =>
                        p.id === slot.id ? { ...p, status: 'error' as const, error: msg } : p
                    ));
                    setError(msg);
                } else if (error.message !== 'rate_limit') {
                    console.error("Erro na geração:", error);
                    setPendingSlots(prev => prev.map(p =>
                        p.id === slot.id ? { ...p, status: 'error' as const, error: error.message } : p
                    ));
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
                decrementGenerating();
                abortControllersRef.current = abortControllersRef.current.filter(c => c !== controller);
            }
        });

        // Use allSettled to ensure all finish even if some fail
        await Promise.allSettled(generationPromises);
    };

    const handleCancelGeneration = () => {
        if (mediaMode === 'video') {
            videoPolling.stopPolling();
        } else {
            abortControllersRef.current.forEach(c => c.abort());
            abortControllersRef.current = [];
        }
        setPendingSlots([]);
        setError("Geração cancelada pelo usuário.");
    };

    const removePendingSlot = (id: string) => {
        setPendingSlots(prev => prev.filter(p => p.id !== id));
    };

    const handleFavorite = async () => {
        if (!lastGenerationId) return;
        await toggleFavorite(lastGenerationId, setIsFavorited);
    };

    const toggleFavorite = async (genId: string, setState: (v: boolean) => void) => {
        try {
            const res = await fetch("/api/favorites", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ generationId: genId }),
            });
            if (res.ok) {
                const data = await res.json();
                setState(data.isFavorite);
                // Atualizar lista local se necessÃ¡rio
                setSessionImages(prev => prev.map(img => img.id === genId ? { ...img, is_favorite: data.isFavorite } : img));
            }
        } catch { /* silent */ }
    };

    const handleGenerateTTS = async () => {
        if (!ttsText.trim()) return;
        setTtsIsGenerating(true);
        setTtsError(null);
        setTtsAudioUrl(null);
        
        try {
            let base64Audio = undefined;
            if (ttsVoiceFile) {
                // Convert file to base64
                const reader = new FileReader();
                base64Audio = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(ttsVoiceFile);
                });
            }

            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: ttsText.trim(),
                    audio_prompt_b64: base64Audio,
                })
            });

            if (!res.ok) {
                let errorMsg = "Erro ao gerar áudio (Código: " + res.status + ")";
                try {
                    const err = await res.json();
                    errorMsg = err.error || errorMsg;
                } catch {
                    const textErr = await res.text();
                    errorMsg = textErr ? `Erro no Servidor: ${textErr.substring(0, 50)}...` : errorMsg;
                }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            setTtsAudioUrl(`data:audio/wav;base64,${data.audio_b64}`);
            
            // Auto play
            setTimeout(() => {
                if (ttsAudioRef.current) {
                    ttsAudioRef.current.play().catch(e => console.log('Auto-play blocked:', e));
                }
            }, 100);

        } catch (err: any) {
            setTtsError(err.message || "Erro desconhecido");
        } finally {
            setTtsIsGenerating(false);
        }
    };

    const handleDeleteSession = async (id: string) => {
        try {
            const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
            if (res.ok) {
                // If deleting active session, reset active session
                if (activeSessionId === id) {
                    setActiveSession(null, null);
                    setSessionImages([]);
                }
                setSessions(prev => prev.filter(s => s.id !== id));
                setSessionToDelete(null);
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    // â”€â”€ Multi-select Logic â”€â”€
    const handlePointerDown = (id: string, e: React.PointerEvent) => {
        // Only trigger on left click (button 0) or touch
        if (e.pointerType === "mouse" && e.button !== 0) return;

        if (selectionMode) {
            // If already in selection mode, just toggle this image
            toggleSelection(id);
        } else {
            // Start long press timer
            longPressTimeoutRef.current = setTimeout(() => {
                setSelectionMode(true);
                setSelectedIds(new Set([id]));
                if (window.navigator?.vibrate) {
                    window.navigator.vibrate(50); // Haptic feedback
                }
            }, 600); // 600ms = long press
        }
    };

    const handlePointerUp = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const handlePointerLeave = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // If last item deselected, exit selection mode automatically
                if (next.size === 0) setSelectionMode(false);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCancelSelection = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        // Show native confirmation for batch
        const count = selectedIds.size;
        if (!window.confirm(`Tem certeza que deseja mover ${count} imagem${count > 1 ? 'ns' : ''} para a lixeira?`)) return;

        setIsBatchDeleting(true);
        try {
            const res = await fetch("/api/generations/batch-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });

            if (res.ok) {
                // Remove from local state and clear selection
                setSessionImages(prev => prev.filter(img => !selectedIds.has(img.id)));
                handleCancelSelection();
            } else {
                console.error("Failed to batch delete");
            }
        } catch (error) {
            console.error("Error during batch delete:", error);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleRenameSession = async () => {
        if (!sessionToRename || !renameName.trim()) return;
        try {
            const res = await fetch(`/api/sessions/${sessionToRename.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: renameName.trim() }),
            });

            if (res.ok) {
                const updatedSession = await res.json();

                // Update local list
                setSessions(prev => prev.map(s => s.id === updatedSession.id ? { ...s, name: updatedSession.name } : s));

                // Update active session name if it's the one we just renamed
                if (activeSessionId === updatedSession.id) {
                    setActiveSession(updatedSession.id, updatedSession.name);
                }

                setSessionToRename(null);
                setRenameName("");
            }
        } catch (error) {
            console.error("Failed to rename session:", error);
        }
    };

    // Auto-update resolution when model or aspect ratio changes.
    // If the default resolution is 1080p in video mode, force duration to 8s.
    useEffect(() => {
        const resolutions = MODEL_RESOLUTIONS[selectedModel]?.[aspectRatio];
        if (resolutions && resolutions.length > 0) {
            const newRes = resolutions[0];
            setSelectedResolution(newRes);
            if (mediaMode === 'video' && newRes === '1080p') setVideoDuration(8);
        }
    }, [selectedModel, aspectRatio, mediaMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Enforce 1080p ↔ 8s constraint for video mode.
    const handleSetResolution = (res: string) => {
        setSelectedResolution(res);
        if (mediaMode === 'video' && res === '1080p') setVideoDuration(8);
    };
    const handleSetDuration = (s: number) => {
        if (mediaMode === 'video' && s !== 8 && selectedResolution === '1080p') setSelectedResolution('720p');
        setVideoDuration(s);
    };

    /** Adapta SessionGeneration para o tipo canÃ´nico GenerationDetail */
    const toDetail = (img: SessionGeneration): GenerationDetail => ({
        id: img.id,
        prompt: img.prompt,
        model: img.model,
        imageUrl: img.imageUrl,
        aspectRatio: img.aspectRatio,
        resolution: img.resolution ?? undefined,
        mediaType: img.mediaType,
        isFavorite: !!img.is_favorite,
        attachments: img.attachments ? JSON.parse(img.attachments) : [],
        metadata: img.metadata || undefined,
    });

    const handleUseAsBase = (gen: GenerationDetail) => {
        restoreSession({
            prompt: gen.prompt,
            model: gen.model as ModelId,
            aspectRatio: gen.aspectRatio ?? "1:1",
            attachments: gen.attachments ?? [],
            metadata: gen.metadata
        });
        setSelectedImage(null);
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div
            className="flex flex-col"
        >
            {/* order-1: Header + Seletores (topo, nÃ£o rola) */}
            <div className="order-1 shrink-0 px-4 md:px-8 pt-8 pb-4 max-w-5xl mx-auto w-full">

            {/* Header & Selectors Container */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                            {mediaMode === 'image' ? <Zap className="w-6 h-6 text-white" /> : <Film className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-xl md:text-2xl text-text-primary tracking-tight">Studio AI</h1>
                            <p className="text-xs md:text-sm text-text-muted hidden md:block">Crie {mediaMode === 'image' ? 'imagens incríveis' : 'vídeos surreais'} com inteligência artificial</p>
                        </div>
                    </div>
                    {/* Media Type Toggle */}
                    <div className="flex bg-bg-glass border border-border-default rounded-xl p-1 shadow-sm w-full md:w-auto">
                        <button
                            onClick={() => { setMediaMode('image'); setModel('flash'); }}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mediaMode === 'image' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-primary'}`}
                        >
                            <ImageIcon className="w-4 h-4" /> <span className="hidden md:inline">Imagem</span>
                        </button>
                        <button
                            onClick={() => { setMediaMode('video'); setModel('veo-3.1-lite'); setAspectRatio('16:9'); }}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mediaMode === 'video' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-primary'}`}
                        >
                            <Video className="w-4 h-4" /> <span className="hidden md:inline">Vídeo</span>
                        </button>
                        <button
                            onClick={() => { setMediaMode('audio'); }}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mediaMode === 'audio' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-primary'}`}
                        >
                            <Mic className="w-4 h-4" /> <span className="hidden md:inline">Áudio</span>
                        </button>
                    </div>
                </div>

                {/* Session + Project â€” linha compacta */}
                <div className="flex gap-2 overflow-hidden">
                    {/* SessÃ£o */}
                    <div className="relative z-50 flex-1 min-w-0">
                        <button
                            onClick={() => setShowSessionMenu(!showSessionMenu)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-bg-glass border border-border-default rounded-xl text-xs hover:border-accent/50 transition-all shadow-sm overflow-hidden"
                        >
                            <History className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span className="truncate text-text-secondary font-medium flex-1 text-left">
                                {activeSessionName || "Sessão…"}
                            </span>
                            <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
                        </button>

                        <AnimatePresence>
                            {showSessionMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden z-[60]"
                                >
                                    <div className="p-2 border-b border-border-default">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nova sessão..."
                                                className="flex-1 px-3 py-2 bg-bg-glass rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent/50"
                                                value={newSessionName}
                                                onChange={(e) => setNewSessionName(e.target.value)}
                                            />
                                            <button
                                                onClick={handleCreateSession}
                                                disabled={!newSessionName.trim()}
                                                className="p-2 bg-accent hover:bg-accent-hover text-white rounded-lg disabled:opacity-50 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto py-1">
                                        {sessions.map((s) => (
                                            <div
                                                key={s.id}
                                                className={`group flex items-center justify-between px-2 py-1 mx-2 rounded-lg hover:bg-bg-glass-hover transition-colors ${activeSessionId === s.id ? "bg-accent/5" : ""}`}
                                            >
                                                <button
                                                    onClick={() => { setActiveSession(s.id, s.name); setShowSessionMenu(false); }}
                                                    className={`flex-1 text-left py-1.5 text-sm flex items-center justify-between ${activeSessionId === s.id ? "text-accent" : "text-text-secondary"}`}
                                                >
                                                    <span className="truncate max-w-[150px]">{s.name}</span>
                                                    <span className="text-[10px] text-text-muted bg-bg-glass px-1.5 py-0.5 rounded-full border border-border-default ml-2">{s.image_count}</span>
                                                </button>
                                                <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(s.id); }} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setSessionToRename(s); setRenameName(s.name); }} className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-md transition-all" title="Renomear"><Pencil className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Projeto */}
                    <div className="relative z-40 flex-1 min-w-0">
                        <button
                            onClick={() => setShowProjectMenu(!showProjectMenu)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-bg-glass border border-border-default rounded-xl text-xs hover:border-accent/50 transition-all shadow-sm overflow-hidden"
                        >
                            <FolderOpen className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span className="truncate text-text-secondary font-medium flex-1 text-left">
                                {activeProjectName || "Geral"}
                            </span>
                            <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
                        </button>

                        <AnimatePresence>
                            {showProjectMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden z-[60]"
                                >
                                    <div className="max-h-60 overflow-y-auto py-1">
                                        <button
                                            onClick={() => { setActiveProject(null, null); setShowProjectMenu(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg-glass-hover flex items-center gap-2 transition-colors ${!activeProjectId ? "text-accent bg-accent/5" : "text-text-secondary"}`}
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            Sem Projeto
                                        </button>
                                        {projects.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setActiveProject(p.id, p.name); setShowProjectMenu(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg-glass-hover flex items-center justify-between transition-colors ${activeProjectId === p.id ? "text-accent bg-accent/5" : "text-text-secondary"}`}
                                            >
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            </div>{/* /order-1 header */}

            {/* order-2: Prompt */}
            <div className="order-2 shrink-0 border-t border-border-default bg-bg-root/95 backdrop-blur-sm">
                <div className="px-4 md:px-8 py-3 max-w-5xl mx-auto">

            {/* Prompt Editor & Controls */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                {mediaMode === 'audio' ? (
                    <div className="space-y-4 bg-bg-surface p-4 rounded-xl border border-border-default shadow-sm">
                        
                        {/* Upload de Voz Cloned */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                Clone de Voz (Opcional)
                            </label>
                            
                            <div
                                onDragOver={(e) => { e.preventDefault(); setTtsIsDragging(true); }}
                                onDragLeave={() => setTtsIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setTtsIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        setTtsVoiceFile(e.dataTransfer.files[0]);
                                    }
                                }}
                                className={`
                                    relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[100px]
                                    ${ttsIsDragging ? 'border-accent bg-accent/5' : 'border-border-default bg-bg-glass hover:bg-bg-glass-hover'}
                                    ${ttsVoiceFile ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
                                `}
                                onClick={() => ttsFileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={ttsFileInputRef} 
                                    className="hidden" 
                                    accept="audio/wav,audio/mp3,audio/aac,audio/ogg" 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) setTtsVoiceFile(e.target.files[0]);
                                    }}
                                />
                                {ttsVoiceFile ? (
                                    <>
                                        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2">
                                            <Check className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium text-emerald-400 max-w-[200px] truncate">{ttsVoiceFile.name}</span>
                                        <span className="text-xs text-text-muted mt-1">Clique para trocar de arquivo</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-bg-root text-text-muted rounded-full flex items-center justify-center mb-2 shadow-sm border border-border-default group-hover:text-accent transition-colors">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium text-text-secondary">Arraste um áudio curto (~10s)</span>
                                        <span className="text-xs text-text-muted mt-1">.wav, .mp3, .ogg ou .aac</span>
                                    </>
                                )}
                            </div>
                            {ttsVoiceFile && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setTtsVoiceFile(null); }}
                                    className="self-end text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Remover clone
                                </button>
                            )}
                        </div>

                        {/* Texto TTS */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                    Texto
                                </label>
                                <span className={`text-xs ${ttsText.length > ttsCHARS_MAX ? 'text-red-400 font-bold' : 'text-text-muted'}`}>
                                    {ttsText.length} / {ttsCHARS_MAX}
                                </span>
                            </div>
                            <textarea
                                ref={ttsTextareaRef}
                                value={ttsText}
                                onChange={(e) => setTtsText(e.target.value)}
                                placeholder="Digite o que a IA deve falar..."
                                className="w-full min-h-[120px] p-4 bg-bg-root rounded-xl border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                            />
                            
                            {/* Tags Paralinguísticas (Atalhos) */}
                            <div className="flex flex-wrap gap-2 mt-1">
                                {TTS_TAGS.map(t => (
                                    <button
                                        key={t.tag}
                                        onClick={() => {
                                            const el = ttsTextareaRef.current;
                                            if (!el) { setTtsText(prev => prev + ' ' + t.tag); return; }
                                            const start = el.selectionStart;
                                            const end = el.selectionEnd;
                                            const newText = ttsText.substring(0, start) + t.tag + ttsText.substring(end);
                                            setTtsText(newText);
                                            setTimeout(() => { el.selectionStart = el.selectionEnd = start + t.tag.length; el.focus(); }, 0);
                                        }}
                                        className="px-2 py-1 bg-bg-root border border-border-default rounded-md text-xs text-text-secondary hover:border-accent hover:text-accent transition-all flex items-center gap-1 shadow-sm"
                                    >
                                        <span className="opacity-70">{t.emoji}</span> {t.tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Erro TTS */}
                        {ttsError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {ttsError}
                            </div>
                        )}

                        {/* Gerar TTS Botão */}
                        <button 
                            onClick={handleGenerateTTS} 
                            disabled={!ttsText.trim() || ttsText.length > ttsCHARS_MAX || ttsIsGenerating}
                            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:bg-bg-glass disabled:text-text-muted disabled:border-border-default disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl shadow-lg transition-all border border-transparent"
                        >
                            {ttsIsGenerating ? (
                                <><Loader2 className="w-5 h-5 animate-spin"/> Sintetizando áudio...</>
                            ) : (
                                <><Volume2 className="w-5 h-5"/> Gerar Fala</>
                            )}
                        </button>
                    </div>
                ) : (
                    <>
                {/* Visual Attachments Preview via ImageSlotGrid */}
                <ImageSlotGrid maxSlots={getMaxAttachments(selectedModel)} videoMode={mediaMode === 'video'} />

                {/* Upload Error */}
                {uploadError && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mb-2">
                        <AlertTriangle className="w-3 h-3" /> {uploadError}
                    </p>
                )}

                {/* Warning for Imagen with attachments */}
                {Object.keys(attachments).some(k => attachments[parseInt(k, 10)] !== null) && selectedModel === "imagen" && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Imagen 4 Ultra não suporta imagens de referência. Use Flash ou Pro para edição de imagens.
                    </div>
                )}

                {/* Prompt textarea */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Prompt</label>
                        <div className="flex items-center gap-1">
                            {mediaMode === 'video' && (
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={!currentPrompt.trim() || isEnhancing}
                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Melhorar prompt com IA para vídeo"
                                >
                                    {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    Melhorar
                                </button>
                            )}
                            <button
                                onClick={() => { setPrompt(""); clearAttachments(); }}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Limpar prompt e anexos"
                            >
                                <Eraser className="w-3 h-3" />
                                Limpar
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={currentPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={mediaMode === 'video' ? "Descreva o vídeo que deseja gerar..." : "Descreva a imagem que deseja gerar..."}
                        rows={2}
                        className="w-full px-4 py-3 bg-bg-glass border border-border-default rounded-xl font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent/30 resize-none transition-all shadow-sm md:rows-3 md:resize-y"
                    />
                    {/* Negative Prompt — vídeo only */}
                    {mediaMode === 'video' && showNegativePrompt && (
                        <textarea
                            value={videoNegativePrompt}
                            onChange={(e) => setVideoNegativePrompt(e.target.value)}
                            placeholder="O que evitar no vídeo... (ex: blur, distortion, text, watermark)"
                            rows={2}
                            className="w-full px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 resize-none transition-all shadow-sm"
                        />
                    )}
                </div>

                {/* Mobile: grid 4 colunas â€” cada select ocupa 1 coluna, icon-only */}
                <div className="grid grid-cols-4 gap-1.5 md:hidden p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm">
                    {/* Modelo */}
                    <UISelect<ModelId>
                        compact
                        value={selectedModel}
                        onChange={(v) => setModel(v as ModelId)}
                        activeClass={
                            selectedModel === "flash" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                            selectedModel === "pro" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                            selectedModel === "imagen" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            selectedModel === "veo-3.1-fast" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                            selectedModel === "veo-3.1-lite" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        }
                        icon={<Zap className="w-3.5 h-3.5" />}
                        options={mediaMode === 'image' ? [
                            { value: "flash", label: "Flash" },
                            { value: "pro", label: "NB 2" },
                            { value: "imagen", label: "Img4" },
                        ] : [
                            { value: "veo-3.1-lite", label: "Lite" },
                            { value: "veo-3.1-fast", label: "Fast" },
                            { value: "veo-3.1", label: "Quality" },
                        ]}
                    />
                    {/* Aspect Ratio */}
                    <UISelect<string>
                        compact
                        value={aspectRatio}
                        onChange={(v) => setAspectRatio(v as string)}
                        activeClass="bg-accent/20 text-accent-light border-accent/30"
                        icon={<BoxSelect className="w-3.5 h-3.5" />}
                        options={(mediaMode === 'video' ? ['16:9', '9:16', '1:1'] : ASPECT_RATIOS).map((r) => ({ value: r, label: r }))}
                    />
                    {/* Resolução */}
                    <UISelect<string>
                        compact
                        value={selectedResolution}
                        onChange={(v) => handleSetResolution(v as string)}
                        activeClass="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        icon={<Maximize2 className="w-3.5 h-3.5" />}
                        options={(MODEL_RESOLUTIONS[selectedModel]?.[aspectRatio] || ["1024×1024"]).map((r) => ({ value: r, label: r.split(" ")[0] }))}
                    />
                    {/* Duração (vídeo) ou Quantidade (imagem) */}
                    {mediaMode === 'video' ? (
                        <UISelect<number>
                            compact
                            value={videoDuration}
                            onChange={(v) => handleSetDuration(Number(v))}
                            activeClass="bg-amber-500/20 text-amber-300 border-amber-500/30"
                            icon={<Timer className="w-3.5 h-3.5" />}
                            options={[
                                { value: 4, label: "4s" },
                                { value: 6, label: "6s" },
                                { value: 8, label: "8s" },
                            ].filter(o => !(selectedResolution === '1080p' && o.value !== 8))}
                        />
                    ) : (
                        <UISelect<number>
                            compact
                            value={generationCount}
                            onChange={(v) => setGenerationCount(Number(v))}
                            activeClass="bg-accent/20 text-accent border-accent/30"
                            disabled={selectedModel === 'imagen'}
                            icon={<Layers className="w-3.5 h-3.5" />}
                            options={[
                                { value: 1, label: "×1" },
                                { value: 2, label: "×2" },
                                { value: 4, label: "×4" },
                            ]}
                        />
                    )}
                </div>

                {/* Mobile: Thinking Level — linha extra quando pro */}
                {mediaMode === 'image' && selectedModel === "pro" && (
                    <div className="flex md:hidden items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm">
                        {THINKING_LEVELS.map((level) => (
                            <button
                                key={level}
                                onClick={() => setThinkingLevel(level)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight whitespace-nowrap ${thinkingLevel === level ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:text-text-primary"}`}
                            >
                                {level === 'MINIMAL' ? 'Rápido' : level === 'LOW' ? 'Leve' : level === 'MEDIUM' ? 'Médio' : 'Máximo'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Desktop: flex com os grupos de botÃµes originais */}
                <div className="hidden md:flex gap-2 pb-0.5">
                    {/* Modelo */}
                    <div className="flex items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm shrink-0">
                        {mediaMode === 'image' ? (
                            <>
                                <button onClick={() => setModel("flash")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedModel === "flash" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-text-muted hover:text-text-primary"}`}><Zap className="w-3.5 h-3.5" /> Flash</button>
                                <button onClick={() => setModel("pro")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedModel === "pro" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-text-muted hover:text-text-primary"}`}><Sparkles className="w-3.5 h-3.5" /> NB 2</button>
                                <button onClick={() => setModel("imagen")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedModel === "imagen" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-text-muted hover:text-text-primary"}`}><Star className="w-3.5 h-3.5" /> Imagen 4</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setModel("veo-3.1-lite")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedModel === "veo-3.1-lite" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-text-muted hover:text-text-primary"}`}><Sparkles className="w-3.5 h-3.5" /> Lite</button>
                                <button onClick={() => setModel("veo-3.1-fast")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedModel === "veo-3.1-fast" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-text-muted hover:text-text-primary"}`}><Zap className="w-3.5 h-3.5" /> Fast</button>
                                <button onClick={() => setModel("veo-3.1")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedModel === "veo-3.1" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-text-muted hover:text-text-primary"}`}><Diamond className="w-3.5 h-3.5" /> Quality</button>
                            </>
                        )}
                    </div>

                    {/* Aspect Ratio */}
                    <div className="flex items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm shrink-0">
                        {(mediaMode === 'video' ? ['16:9', '9:16', '1:1'] : ASPECT_RATIOS).map((ratio) => (
                            <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${aspectRatio === ratio ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:text-text-primary"}`}>
                                {ratio}
                            </button>
                        ))}
                    </div>

                    {/* Thinking Level */}
                    {selectedModel === "pro" && (
                        <div className="flex items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm shrink-0">
                            {THINKING_LEVELS.map((level) => (
                                <button key={level} onClick={() => setThinkingLevel(level)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight whitespace-nowrap ${thinkingLevel === level ? "bg-accent/20 text-accent-light border border-accent/30" : "text-text-muted hover:text-text-primary"}`} title={`Nível de raciocínio: ${level}`}>
                                    {level === 'MINIMAL' ? 'Rápido' : level === 'LOW' ? 'Leve' : level === 'MEDIUM' ? 'Médio' : 'Máximo'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Video Options — duration, audio, negative prompt toggle */}
                {mediaMode === 'video' && (
                    <div className="hidden md:flex gap-2">
                        {/* Duration */}
                        <div className="flex items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm shrink-0">
                            <Timer className="w-3.5 h-3.5 text-text-muted ml-1.5" />
                            {[4, 6, 8].map((s) => {
                                const locked = selectedResolution === '1080p' && s !== 8;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => handleSetDuration(s)}
                                        disabled={locked}
                                        title={locked ? "1080p requer 8s" : undefined}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${videoDuration === s ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-text-muted hover:text-text-primary"} ${locked ? "opacity-30 cursor-not-allowed" : ""}`}
                                    >
                                        {s}s
                                    </button>
                                );
                            })}
                        </div>
                        {/* Negative prompt toggle */}
                        <button
                            onClick={() => setShowNegativePrompt(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm ${showNegativePrompt ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-bg-glass text-text-muted border-border-default hover:text-text-primary"}`}
                            title="Prompt negativo — o que evitar"
                        >
                            <MinusCircle className="w-3.5 h-3.5" />
                            Negativo
                        </button>
                    </div>
                )}

                {/* Linha 2: Desktop (resoluÃ§Ã£o + quantidade) + BotÃ£o Gerar */}
                <div className="flex items-center gap-2">
                    {/* Resolution â€” botÃµes no desktop */}
                    <div className="hidden md:flex items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm">
                        {(MODEL_RESOLUTIONS[selectedModel]?.[aspectRatio] || []).length > 1 ? (
                            (MODEL_RESOLUTIONS[selectedModel]?.[aspectRatio] || []).map((resolution) => (
                                <button key={resolution} onClick={() => handleSetResolution(resolution)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedResolution === resolution ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-text-muted hover:text-text-primary"}`}>
                                    {resolution}
                                </button>
                            ))
                        ) : (
                            <span className="px-2.5 py-1.5 text-xs font-medium text-text-muted whitespace-nowrap">
                                {(MODEL_RESOLUTIONS[selectedModel]?.[aspectRatio] || [])[0] || "1024×1024"}
                            </span>
                        )}
                    </div>

                    {/* Quantity â€” botÃµes no desktop */}
                    <div className="hidden md:flex items-center gap-1 p-1 bg-bg-glass border border-border-default rounded-xl shadow-sm">
                        {[1, 2, 4].map((count) => {
                            const isDisabled = (mediaMode === 'video' && count !== 1) || (selectedModel === 'imagen' && count !== 1);
                            return (
                                <button key={`count-${count}`} onClick={() => setGenerationCount(count)} disabled={isDisabled} title={isDisabled ? "Apenas 1 geraÃ§Ã£o por vez" : ""} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${generationCount === count ? "bg-accent/20 text-accent border border-accent/30" : "text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"}`}>
                                    ×{count}
                                </button>
                            );
                        })}
                    </div>

                    {/* BotÃ£o Gerar â€” largura total no mobile */}
                    {isGenerating || videoPolling.status === 'processing' ? (
                        <button key="btn-cancel-gen" onClick={(e) => { handleCancelGeneration(); e.currentTarget.blur(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium transition-all shadow-sm">
                            <Square className="w-4 h-4 fill-red-400" />
                            Cancelar
                        </button>
                    ) : (
                        <button key="btn-start-gen" onClick={(e) => { handleGenerate(); e.currentTarget.blur(); }} disabled={!currentPrompt.trim() || isGenerating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-accent/20">
                            <Play className="w-4 h-4" />
                            {mediaMode === 'image' ? (generationCount > 1 ? `Gerar ×${generationCount}` : "Gerar") : "Gerar Vídeo"}
                        </button>
                    )}
                </div>
                    </>
                )}
            </motion.div>

                </div>
            </div>{/* /order-3 prompt */}

            {/* order-2: Galeria + resultados (rolÃ¡vel, entre header e prompt) */}
            <div ref={scrollContainerRef} className="order-2">
                <div className="px-4 md:px-8 pb-6 max-w-5xl mx-auto space-y-6">

            {/* Error Message — image/video only */}
            {
                mediaMode !== 'audio' && error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {error}
                    </motion.div>
                )
            }

            {/* Generation Status — image/video only */}
            {
                mediaMode !== 'audio' && (isGenerating || videoPolling.status === 'processing') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 glass-card">
                        <StudioGeneratingIcon className="mb-4" />
                        <p className="text-sm text-text-secondary animate-pulse text-center max-w-sm">
                            {mediaMode === 'image' ? 'Criando sua obra de arte...' : 'Compondo os frames do seu vídeo (isso pode demorar 1 ou 2 min)...'}
                        </p>
                    </motion.div>
                )
            }

            {/* TTS Generation Status */}
            {
                mediaMode === 'audio' && ttsIsGenerating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 glass-card">
                        <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
                        <p className="text-sm text-text-secondary animate-pulse text-center max-w-sm">
                            Sintetizando áudio na rede neural... isso pode levar cerca de 15 segundos.
                        </p>
                    </motion.div>
                )
            }

            {/* TTS Result Preview */}
            {
                mediaMode === 'audio' && ttsAudioUrl && !ttsIsGenerating && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4 space-y-4 shadow-2xl border-white/5">
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                                <Volume2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-text-primary">Áudio Gerado</h3>
                                <p className="text-xs text-text-muted">Chatterbox Turbo TTS</p>
                            </div>
                        </div>
                        
                        <audio ref={ttsAudioRef} src={ttsAudioUrl} controls className="w-full h-12 rounded-lg" />
                        
                        <div className="flex justify-end pt-2">
                            <a 
                                href={ttsAudioUrl} 
                                download="nano-banana-voice.wav"
                                className="flex items-center gap-2 px-4 py-2 bg-bg-glass hover:bg-bg-glass-hover text-text-secondary hover:text-white rounded-lg border border-border-default transition-all text-sm font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Baixar Áudio (.wav)
                            </a>
                        </div>
                    </motion.div>
                )
            }

            {/* Result Preview (Current Generation) */}
            {
                result && !isGenerating && videoPolling.status !== 'processing' && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4 space-y-3 shadow-2xl border-white/5">
                        <div className="relative group">
                            {mediaMode === 'video' || result.endsWith('.mp4') ? (
                                <video src={result} controls preload="metadata" loop autoPlay playsInline muted className="w-full rounded-xl shadow-lg" />
                            ) : (
                                <div className={`relative w-full overflow-hidden rounded-xl shadow-lg ${ASPECT_CLASS[aspectRatio] ?? "aspect-square"}`}>
                                    <Image
                                        src={result}
                                        alt="Gerado agora"
                                        fill
                                        unoptimized
                                        sizes="100vw"
                                        className="cursor-pointer object-contain"
                                        onClick={() => {
                                            const found = sessionImages.find(img => img.id === lastGenerationId);
                                            if (found) {
                                                setSelectedImage(found);
                                            } else if (lastGenerationId) {
                                                // Fallback enquanto sessionImages ainda nÃ£o sincronizou
                                                setSelectedImage({
                                                    id: lastGenerationId,
                                                    imageUrl: result,
                                                    previewUrl: result,
                                                    prompt: lastPrompt || "",
                                                    model: selectedModel,
                                                    created_at: new Date().toISOString(),
                                                    aspectRatio,
                                                    resolution: selectedResolution,
                                                    mediaType: 'image',
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={handleFavorite}
                                    className={`p-3 rounded-full backdrop-blur-md transition-all ${isFavorited ? "bg-amber-500/30 text-amber-300 border border-amber-500/40" : "bg-black/60 text-white hover:text-amber-300 hover:bg-black/80 border border-white/10"}`}
                                    title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                >
                                    <Star className={`w-5 h-5 ${isFavorited ? "fill-amber-300" : ""}`} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-muted px-1">
                            <span>Gerado agora</span>
                            {isFavorited && <span className="text-amber-300 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-300" /> Salvo</span>}
                        </div>
                    </motion.div>
                )
            }

            {/* Empty State — image/video only */}
            {
                mediaMode !== 'audio' && !result && !isGenerating && videoPolling.status !== 'processing' && !error && !activeSessionId && (sessionImages.length === 0 && pendingSlots.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 glass-card">
                        <StudioEmptyState mediaType={mediaMode} className="mb-4 text-text-muted/30" />
                        <h3 className="text-lg font-medium text-text-secondary mb-2">Pronto para criar</h3>
                        <p className="text-sm text-text-muted max-w-md text-center">
                            Selecione uma sessão ou crie uma nova para começar a gerar {mediaMode === 'image' ? 'imagens' : 'vídeos'}.
                        </p>
                    </div>
                )
            }

            {/* Session Gallery (FIFO) — image/video only */}
            {
                mediaMode !== 'audio' && (activeSessionId || true) && (
                    <div className="order-3 space-y-4 pt-4 border-t border-border-default/50">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Histórico da Sessão ({sessionImages.length}/10)
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {/* Pending Slots (Loading/Error) */}
                            <AnimatePresence mode="popLayout">
                                {pendingSlots.map((slot) => (
                                    <motion.div
                                        key={slot.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className={`${ASPECT_CLASS[aspectRatio] ?? "aspect-square"} rounded-xl overflow-hidden border flex flex-col items-center justify-center p-4 relative group ${slot.status === 'loading'
                                                ? "bg-bg-glass border-accent/20 animate-pulse"
                                                : "bg-red-500/5 border-red-500/30"
                                            }`}
                                    >
                                        {slot.status === 'loading' ? (
                                            <>
                                                <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
                                                <span className="text-[10px] text-text-muted font-medium uppercase tracking-tighter">Gerando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-col items-center text-center gap-2">
                                                    <AlertCircle className="w-8 h-8 text-red-400 opacity-50" />
                                                    <span className="text-[10px] text-red-300 font-bold uppercase">Falha</span>
                                                    <p className="text-[9px] text-red-200/60 line-clamp-2 px-1 leading-tight">{slot.error || "Erro desconhecido"}</p>
                                                </div>
                                                <button
                                                    onClick={() => removePendingSlot(slot.id)}
                                                    className="absolute top-1 right-1 p-1 rounded-md bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Existing Images */}
                            {sessionImages.map((img, index) => (
                                <motion.div
                                    key={img.id}
                                    layoutId={`image-${img.id}`}
                                    onPointerDown={(e) => handlePointerDown(img.id, e)}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerLeave}
                                    onClick={() => {
                                        // If not in selection mode, long press timeout was cleared before triggering click (click happens after pointer up).
                                        // Wait, actually `onClick` might fire right after `onPointerUp`.
                                        // If `selectionMode` is true, we ONLY toggle selection (handled in PointerDown).
                                        // Wait, `onClick` also fires. Let's prevent `setSelectedImage` if in selectionMode.
                                        if (selectionMode) {
                                            // Handled in onPointerDown. Prevent modal.
                                            return;
                                        } else {
                                            setSelectedImage(img);
                                        }
                                    }}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer group relative bg-bg-surface ${selectedIds.has(img.id)
                                        ? "border-accent scale-[0.98] ring-4 ring-accent/20 shadow-lg shadow-accent/10"
                                        : "border-border-default hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
                                        }`}
                                >
                                    {img.mediaType === 'video' || img.imageUrl.endsWith('.mp4') ? (
                                        <>
                                            <video
                                                src={`${img.imageUrl}#t=0.001`}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${selectionMode && !selectedIds.has(img.id) ? "opacity-60 grayscale-[50%]" : "group-hover:scale-105"
                                                    }`}
                                                preload="metadata"
                                                muted playsInline
                                                style={{ pointerEvents: 'none' }} // Prevent video from stealing pointer events
                                            />
                                            <div className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 backdrop-blur-sm border border-border-default/50 shadow-sm">
                                                <Video className="w-3 h-3 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <Image
                                            src={img.previewUrl || img.imageUrl}
                                            alt={img.prompt.slice(0, 40)}
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                                            unoptimized
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            priority={index < 2}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-white text-[10px] line-clamp-2 leading-tight">{img.prompt}</p>
                                    </div>
                                    {img.is_favorite && (
                                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-amber-500/30">
                                            <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                                        </div>
                                    )}

                                    {/* Selected Indicator Overlay */}
                                    {selectedIds.has(img.id) && (
                                        <div className="absolute top-2 left-2 p-1.5 rounded-full bg-accent text-white shadow-xl ring-2 ring-white/20 animate-in zoom-in-50 duration-200">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                    {/* Hover overlay for selection mode (if not selected) */}
                                    {selectionMode && !selectedIds.has(img.id) && (
                                        <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 border border-white/50 text-white/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <div className="w-3.5 h-3.5 rounded-full" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            }

                </div>
            </div>{/* /order-2 galeria */}

            {/* Overlays com position:fixed â€” nÃ£o afetam o layout flex */}
            {/* Floating Action Bar for Batch Selection */}
            <AnimatePresence>
                {selectionMode && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-bg-surface border border-border-default rounded-full shadow-2xl px-4 py-3 flex items-center gap-4 min-w-[320px] max-w-[90vw] overflow-hidden justify-between backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-xs">
                                {selectedIds.size}
                            </span>
                            <span className="text-sm font-medium text-text-primary">
                                Selecionad{selectedIds.size === 1 ? 'o' : 'os'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCancelSelection}
                                disabled={isBatchDeleting}
                                className="px-4 py-2 rounded-full text-xs font-medium text-text-secondary hover:bg-bg-glass-hover transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                disabled={selectedIds.size === 0 || isBatchDeleting}
                                className="px-4 py-2 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isBatchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Excluir
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen Image Modal â€” componente compartilhado */}
            <AnimatePresence>
                {selectedImage && (() => {
                    const currentIndex = sessionImages.findIndex((img) => img.id === selectedImage.id);
                    const totalImages = sessionImages.length;
                    const onNext = currentIndex < totalImages - 1 ? () => setSelectedImage(sessionImages[currentIndex + 1]) : undefined;
                    const onPrevious = currentIndex > 0 ? () => setSelectedImage(sessionImages[currentIndex - 1]) : undefined;

                    return (
                        <ImageDetailModal
                            key="studio-detail-modal"
                            gen={toDetail(selectedImage)}
                            onClose={() => setSelectedImage(null)}
                            onUseAsBase={handleUseAsBase}
                            onToggleFavorite={async (genId, currentState) => {
                                await toggleFavorite(genId, () => { });
                                setSessionImages(prev =>
                                    prev.map(img =>
                                        img.id === genId
                                            ? { ...img, is_favorite: !currentState }
                                            : img
                                    )
                                );
                            }}
                            onDelete={async (genId) => {
                                const res = await fetch(`/api/generations/${genId}`, { method: "DELETE" });
                                if (res.ok) {
                                    setSessionImages(prev => prev.filter(img => img.id !== genId));
                                } else {
                                    throw new Error("Failed to delete");
                                }
                            }}
                            requireUnfavoriteConfirmation
                            onNext={onNext}
                            onPrevious={onPrevious}
                        />
                    );
                })()}
            </AnimatePresence>

            {/* Session Delete Modal */}
            <AnimatePresence>
                {sessionToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSessionToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-bg-surface border border-border-default rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="p-3 bg-red-500/10 rounded-full text-red-400 mb-2">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary">Excluir Sessão?</h3>
                                <p className="text-sm text-text-secondary">
                                    Todas as imagens desta sessão serão movidas para a lixeira.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSessionToDelete(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors font-medium text-sm"
                                >
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Session Rename Modal */}
            <AnimatePresence>
                {sessionToRename && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSessionToRename(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-bg-surface border border-border-default rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="p-3 bg-accent/10 rounded-full text-accent mb-2">
                                    <Pencil className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary">Renomear Sessão</h3>
                                <p className="text-sm text-text-secondary">
                                    Digite o novo nome para sua sessão.
                                </p>
                            </div>

                            <input
                                type="text"
                                value={renameName}
                                onChange={(e) => setRenameName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-bg-glass border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 text-center font-medium"
                                placeholder="Nome da sessão"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSession();
                                    if (e.key === 'Escape') setSessionToRename(null);
                                }}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSessionToRename(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRenameSession}
                                    disabled={!renameName.trim()}
                                    className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors font-medium text-sm disabled:opacity-50"
                                >
                                    Salvar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Enhance Prompt Modal */}
            <AnimatePresence>
                {enhanceModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setEnhanceModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-bg-surface border border-border-default rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                                    <Wand2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-text-primary">Prompt Melhorado</h3>
                                    <p className="text-xs text-text-muted">Revise e edite antes de aprovar</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Original</p>
                                <p className="text-xs text-text-secondary bg-bg-glass border border-border-default rounded-lg px-3 py-2 font-mono leading-relaxed">
                                    {currentPrompt}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-purple-400">Melhorado</p>
                                <textarea
                                    value={enhancedPromptDraft}
                                    onChange={(e) => setEnhancedPromptDraft(e.target.value)}
                                    rows={5}
                                    className="w-full px-3 py-2.5 bg-bg-glass border border-purple-500/30 rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setEnhanceModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-border-default text-text-secondary hover:bg-bg-glass-hover transition-colors text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (enhancedPromptDraft.trim()) {
                                            setPrompt(enhancedPromptDraft.trim());
                                        }
                                        setEnhanceModalOpen(false);
                                    }}
                                    disabled={!enhancedPromptDraft.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Usar este prompt
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
