import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ModelId, getMaxAttachments } from "./model-config";

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    description?: string;
}

interface AppState {
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;

    toasts: Toast[];
    addToast: (toast: Toast) => void;
    removeToast: (id: string) => void;

    currentPrompt: string;
    lastPrompt: string;
    setPrompt: (prompt: string) => void;

    selectedModel: ModelId;
    setModel: (model: ModelId) => void;

    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;

    // Contador de gerações ativas em paralelo (substitui setIsGenerating).
    // isGenerating é mantido como campo derivado (= generatingCount > 0) para
    // zero breaking change em todos os consumers de leitura existentes.
    generatingCount: number;
    isGenerating: boolean;
    incrementGenerating: () => void;
    decrementGenerating: () => void;

    activeSessionId: string | null;
    activeSessionName: string | null;
    setActiveSession: (id: string | null, name?: string | null) => void;

    activeProjectId: string | null;
    activeProjectName: string | null;
    setActiveProject: (id: string | null, name?: string | null) => void;

    attachments: Record<number, string | null>;
    attachmentMetadata: Record<number, { x: number, y: number, scale: number } | null>;
    setSlot: (index: number, base64: string, metadata?: { x: number, y: number, scale: number }) => void;
    unsetSlot: (index: number) => void;
    clearAttachments: () => void;
    getFilledAttachments: () => string[];

    // Reconstruction
    restoreSession: (data: {
        prompt: string;
        model: ModelId;
        aspectRatio: string;
        attachments: (string | null)[];
        metadata?: string;
    }) => void;

    activeModule: 'hub' | 'studio' | 'promptsave' | 'kanboard';
    setActiveModule: (module: 'hub' | 'studio' | 'promptsave' | 'kanboard') => void;

    kbActiveBoardId: string | null;
    setKbActiveBoardId: (id: string | null) => void;

    kbActiveSection: 'ALL' | 'FAVORITES' | 'TRASH';
    setKbActiveSection: (section: 'ALL' | 'FAVORITES' | 'TRASH') => void;

    kbBoardCount: number;
    setKbBoardCount: (count: number) => void;

    psPromptCount: number;
    setPsPromptCount: (count: number) => void;

    psActiveSection: 'ALL' | 'FAVORITES' | 'TRASH' | 'CATEGORIES';
    setPsActiveSection: (section: 'ALL' | 'FAVORITES' | 'TRASH' | 'CATEGORIES') => void;

    activePersona: 'thomas' | 'aurora' | null;
    setActivePersona: (persona: 'thomas' | 'aurora' | null) => void;

    thinkingLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
    setThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;

    // Mobile drawer — estado ephemeral (não persiste via partialize)
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
    sidebarCollapsed: false,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    toasts: [],
    addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

    currentPrompt: "",
    lastPrompt: "",
    setPrompt: (prompt) => set({ currentPrompt: prompt, lastPrompt: prompt }),

    selectedModel: "flash",
    setModel: (model) => set((s) => {
        const maxSlots = getMaxAttachments(model);
        const newAttachments = { ...s.attachments };
        let changed = false;

        // Garbage collection: remove data from slots beyond the new limit
        Object.keys(newAttachments).forEach((key) => {
            const idx = parseInt(key, 10);
            if (idx >= maxSlots && newAttachments[idx] !== null) {
                newAttachments[idx] = null;
                changed = true;
            }
        });

        return changed
            ? { selectedModel: model, attachments: newAttachments }
            : { selectedModel: model };
    }),

    aspectRatio: "1:1",
    setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

    generatingCount: 0,
    isGenerating: false,
    incrementGenerating: () => set((s) => {
        const next = s.generatingCount + 1;
        return { generatingCount: next, isGenerating: next > 0 };
    }),
    decrementGenerating: () => set((s) => {
        const next = Math.max(0, s.generatingCount - 1);
        return { generatingCount: next, isGenerating: next > 0 };
    }),

    activeSessionId: null,
    activeSessionName: null,
    setActiveSession: (id, name = null) => set({ activeSessionId: id, activeSessionName: name }),

    activeProjectId: null,
    activeProjectName: null,
    setActiveProject: (id, name = null) => set({ activeProjectId: id, activeProjectName: name }),

    attachments: {},
    attachmentMetadata: {},
    setSlot: (index, base64, metadata = { x: 0.5, y: 0.5, scale: 1 }) => set((s) => ({
        attachments: { ...s.attachments, [index]: base64 },
        attachmentMetadata: { ...s.attachmentMetadata, [index]: metadata }
    })),
    unsetSlot: (index) => set((s) => ({
        attachments: { ...s.attachments, [index]: null },
        attachmentMetadata: { ...s.attachmentMetadata, [index]: null }
    })),
    clearAttachments: () => set({ attachments: {}, attachmentMetadata: {} }),
    getFilledAttachments: () => {
        const atts = get().attachments;
        return Object.keys(atts)
            .map(k => parseInt(k, 10))
            .sort((a, b) => a - b)
            .map(k => atts[k])
            .filter((v): v is string => v !== null);
    },

    restoreSession: (data) => {
        const { prompt, model, aspectRatio, attachments, metadata } = data;

        // Basic restoration
        set({
            currentPrompt: prompt,
            selectedModel: model,
            aspectRatio: aspectRatio,
            activeModule: 'studio' // Force redirect to studio
        });

        // Reconstruction of attachments and positions
        const parsedMetadata = metadata ? JSON.parse(metadata) : null;
        const newAttachments: Record<number, string | null> = {};
        const newMetadata: Record<number, any> = {};

        attachments.forEach((url, i) => {
            const slotIdx = i + 1;
            if (url) {
                newAttachments[slotIdx] = url;
                // If we have spatial metadata for this specific attachment, apply it
                if (parsedMetadata?.attachments?.[i]) {
                    newMetadata[slotIdx] = parsedMetadata.attachments[i];
                } else {
                    newMetadata[slotIdx] = { x: 0.5, y: 0.5, scale: 1 };
                }
            }
        });

        set({
            attachments: newAttachments,
            attachmentMetadata: newMetadata
        });
    },

    activeModule: 'hub',
    setActiveModule: (module) => set({ activeModule: module }),

    kbActiveBoardId: null,
    setKbActiveBoardId: (id) => set({ kbActiveBoardId: id }),

    kbActiveSection: 'ALL',
    setKbActiveSection: (section) => set({ kbActiveSection: section }),

    kbBoardCount: 0,
    setKbBoardCount: (count) => set({ kbBoardCount: count }),

    psPromptCount: 0,
    setPsPromptCount: (count) => set({ psPromptCount: count }),

    psActiveSection: 'ALL',
    setPsActiveSection: (section) => set({ psActiveSection: section }),

    activePersona: null,
    setActivePersona: (persona) => set({ activePersona: persona }),

    thinkingLevel: 'MINIMAL',
    setThinkingLevel: (level) => set({ thinkingLevel: level }),

    mobileDrawerOpen: false,
    setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
        }),
        {
            name: "rgs-session-store",
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({ lastPrompt: state.lastPrompt }),
        }
    )
);

