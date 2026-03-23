import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { setPromptCategory } from '@/app/actions/prompt-category-actions';

// Interfaces estritas baseadas em Zod+TS Separation
export interface PromptBasicInfo {
    id: string;
    title: string;
    folderId: string | null;
    contentSnippet?: string; // para buscas e previews seguros
}

export interface PromptCategoryState {
    isOpen: boolean;
    activeCategoryId: string | null;
    activeCategoryName: string | null;
    prompts: PromptBasicInfo[]; // Central source of truth temporário para o Modal
    isLoading: boolean;
}

export interface PromptCategoryActions {
    openModal: (categoryId: string, categoryName: string, initialPrompts: PromptBasicInfo[]) => void;
    closeModal: () => void;
    // Mutações atômicas com tratamento de falhas embutido (UI Patterns)
    addPrompt: (prompt: PromptBasicInfo) => Promise<{ error?: string }>;
    removePrompt: (promptId: string) => Promise<{ error?: string }>;
}

export type PromptCategoryStore = PromptCategoryState & PromptCategoryActions;

// Instanciação com subscribeWithSelector evitando renders supérfluos (Stale UI)
export const usePromptCategoryStore = create<PromptCategoryStore>()(
    subscribeWithSelector((set, get) => ({
        isOpen: false,
        activeCategoryId: null,
        activeCategoryName: null,
        prompts: [],
        isLoading: false,

        openModal: (categoryId, categoryName, initialPrompts) => {
            set({
                isOpen: true,
                activeCategoryId: categoryId,
                activeCategoryName: categoryName,
                prompts: initialPrompts
            });
        },

        closeModal: () => {
            set({
                isOpen: false,
                activeCategoryId: null,
                activeCategoryName: null,
                prompts: []
            });
        },

        addPrompt: async (prompt) => {
            const { activeCategoryId, prompts } = get();
            if (!activeCategoryId) return { error: "Nenhuma categoria referenciada." };

            if (prompts.find(p => p.id === prompt.id)) return {};

            // Optimistic Update (Progressive Disclosure)
            set({
                prompts: [...prompts, { ...prompt, folderId: activeCategoryId }]
            });

            // Transação via Server Action
            const res = await setPromptCategory(prompt.id, activeCategoryId);

            if (res?.error) {
                // Reversão de estado em caso de falha silenciosa ou bloqueio
                set({
                    prompts: prompts.filter(p => p.id !== prompt.id)
                });
                return { error: res.error };
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('promptsave-mutated'));
            }

            return {};
        },

        removePrompt: async (promptId) => {
            const { activeCategoryId, prompts } = get();
            if (!activeCategoryId) return { error: "Nenhuma categoria referenciada." };

            const targetPrompt = prompts.find(p => p.id === promptId);
            if (!targetPrompt) return { error: "Prompt corrompido ou não encontrado." };

            // Snapshot para Rollback
            const prevPrompts = [...prompts];

            // Optimistic Update
            set({
                prompts: prompts.filter(p => p.id !== promptId)
            });

            // Transação via Server Action desvinculando o prompt
            const res = await setPromptCategory(promptId, null);

            if (res?.error) {
                // Rollback State
                set({ prompts: prevPrompts });
                return { error: res.error };
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('promptsave-mutated'));
            }

            return {};
        }
    }))
);
