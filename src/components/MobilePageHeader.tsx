"use client";

import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

interface MobilePageHeaderProps {
    /**
     * Título estático — usar quando a página não muda dentro do layout.
     * Ex: layouts de módulo single-page (Vault, KanBoard).
     */
    title?: string;

    /**
     * Mapa pathname → título — usar quando o layout contém múltiplas páginas
     * com títulos distintos (ex: Studio com 7+ rotas).
     * O componente lê usePathname() e faz o lookup.
     * Fallback: primeira entrada do mapa quando nenhuma rota exata bater.
     */
    titleMap?: Record<string, string>;

    /** Ação primária opcional exibida à direita do header. */
    action?: {
        label: string;
        icon: LucideIcon;
        onClick: () => void;
    };
}

/**
 * Header de página para mobile — visível apenas em telas < md (flex md:hidden).
 * Renderizado no layout de cada módulo, abaixo do qual vem o <main>.
 *
 * - Hambúrguer: abre o MobileDrawer via store (setMobileDrawerOpen)
 * - Título: static via `title` ou dinâmico via `titleMap` + usePathname
 * - Ação: slot opcional para CTA primário da tela atual
 */
export function MobilePageHeader({ title, titleMap, action }: MobilePageHeaderProps) {
    const pathname            = usePathname();
    const isDrawerOpen        = useAppStore((s) => s.mobileDrawerOpen);
    const setMobileDrawerOpen = useAppStore((s) => s.setMobileDrawerOpen);

    // Resolver título: lookup exato → lookup startsWith → primeiro valor do mapa → prop title
    const resolvedTitle = (() => {
        if (titleMap) {
            const exact = titleMap[pathname];
            if (exact) return exact;

            const partial = Object.entries(titleMap).find(
                ([key]) => key !== "/" && pathname.startsWith(key)
            );
            if (partial) return partial[1];

            // Fallback: primeira entrada do mapa
            const fallback = Object.values(titleMap)[0];
            if (fallback) return fallback;
        }
        return title ?? "";
    })();

    return (
        <div className="flex md:hidden items-center gap-2 h-12 px-3 shrink-0 border-b border-border-default bg-bg-surface">
            <button
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Abrir menu de navegação"
                aria-expanded={isDrawerOpen}
                aria-haspopup="dialog"
                className="p-2 -ml-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            >
                <Menu className="w-5 h-5" />
            </button>

            <span className="flex-1 font-semibold text-sm text-text-primary truncate">
                {resolvedTitle}
            </span>

            {action && (
                <button
                    onClick={action.onClick}
                    aria-label={action.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover transition-colors border border-border-default shrink-0 min-h-11"
                >
                    <action.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{action.label}</span>
                </button>
            )}
        </div>
    );
}
