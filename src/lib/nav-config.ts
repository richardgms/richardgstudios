/**
 * nav-config.ts
 *
 * Configuração de navegação para MobileDrawer.
 * REGRA: dados puros apenas. Zero referências a hooks, stores ou funções.
 *
 * O componente consumidor resolve `type: 'action'` para a função correta
 * via useAppStore() dentro do seu próprio contexto React.
 */

import {
    Search, Brain, Palette, FolderOpen, ImageIcon, Star, Trash2,
    BookmarkCheck, Tag, LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── IDs de seção por módulo ────────────────────────────────────────────────

export type PsSection = "ALL" | "FAVORITES" | "TRASH" | "CATEGORIES";
export type KbSection = "ALL" | "FAVORITES" | "TRASH";
export type ModuleKey = "studio" | "promptsave" | "kanboard";

// ─── Union type para itens de navegação ─────────────────────────────────────

export type StudioNavItem = {
    type: "url";
    href: string;
    label: string;
    icon: LucideIcon;
};

export type PsNavItem = {
    type: "action";
    id: PsSection;
    label: string;
    icon: LucideIcon;
    showBadge?: boolean;
};

export type KbNavItem = {
    type: "action";
    id: KbSection;
    label: string;
    icon: LucideIcon;
    showBadge?: boolean;
};

export type NavItem = StudioNavItem | PsNavItem | KbNavItem;

// ─── Dados de navegação por módulo ──────────────────────────────────────────

export const STUDIO_ITEMS: StudioNavItem[] = [
    { type: "url", href: "/browse",     label: "Explorar",   icon: Search      },
    { type: "url", href: "/brainstorm", label: "Brainstorm", icon: Brain       },
    { type: "url", href: "/studio",     label: "Studio",     icon: Palette     },
    { type: "url", href: "/projects",   label: "Projetos",   icon: FolderOpen  },
    { type: "url", href: "/gallery",    label: "Galeria",    icon: ImageIcon   },
    { type: "url", href: "/favorites",  label: "Favoritos",  icon: Star        },
    { type: "url", href: "/trash",      label: "Lixeira",    icon: Trash2      },
];

export const PS_ITEMS: PsNavItem[] = [
    { type: "action", id: "ALL",        label: "Todos",      icon: BookmarkCheck, showBadge: true },
    { type: "action", id: "FAVORITES",  label: "Favoritos",  icon: Star                          },
    { type: "action", id: "CATEGORIES", label: "Categorias", icon: Tag                           },
    { type: "action", id: "TRASH",      label: "Lixeira",    icon: Trash2                        },
];

export const KB_ITEMS: KbNavItem[] = [
    { type: "action", id: "ALL",       label: "Todos",     icon: LayoutGrid, showBadge: true },
    { type: "action", id: "FAVORITES", label: "Favoritos", icon: Star                        },
    { type: "action", id: "TRASH",     label: "Lixeira",   icon: Trash2                      },
];
