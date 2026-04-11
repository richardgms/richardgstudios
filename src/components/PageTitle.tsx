"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mapeamento de rotas para títulos de módulo.
 * Segue a mesma lógica de detecção do ModuleRail e BottomNavigation.
 */
const STUDIO_ROUTES = ['/browse', '/brainstorm', '/studio', '/projects', '/gallery', '/favorites', '/history', '/trash'];
const PROMPTSAVE_ROUTES = ['/vault'];
const KANBOARD_ROUTES = ['/boards', '/board'];

/**
 * Títulos amigáveis para cada módulo.
 */
const MODULE_TITLES: Record<string, string> = {
    hub: 'Hub',
    studio: 'Studio',
    promptsave: 'Vault',
    kanboard: 'KanBoard',
};

/**
 * Títulos específicos para rotas do Studio (quando quiser mais detalhe).
 */
const STUDIO_PAGE_TITLES: Record<string, string> = {
    '/browse': 'Explorar',
    '/brainstorm': 'Brainstorm',
    '/studio': 'Studio AI',
    '/projects': 'Projetos',
    '/gallery': 'Galeria',
    '/favorites': 'Favoritos',
    '/history': 'Histórico',
    '/trash': 'Lixeira',
};

function getActiveModule(pathname: string): string {
    if (STUDIO_ROUTES.some(r => pathname.startsWith(r))) return 'studio';
    if (PROMPTSAVE_ROUTES.some(r => pathname.startsWith(r))) return 'promptsave';
    if (KANBOARD_ROUTES.some(r => pathname.startsWith(r))) return 'kanboard';
    return 'hub';
}

/**
 * Componente que atualiza dinamicamente o título da aba do navegador.
 * 
 * Padrão: "{Nome do Módulo} | RG Studios"
 * Exemplos:
 * - "Studio | RG Studios"
 * - "Vault | RG Studios"
 * - "KanBoard | RG Studios"
 * - "Hub | RG Studios"
 */
export function PageTitle() {
    const pathname = usePathname();

    useEffect(() => {
        const module = getActiveModule(pathname);
        const moduleTitle = MODULE_TITLES[module] || 'RG Studios';
        
        // Para o módulo Studio, usa o título específico da página se disponível
        let pageTitle = moduleTitle;
        if (module === 'studio' && STUDIO_PAGE_TITLES[pathname]) {
            pageTitle = STUDIO_PAGE_TITLES[pathname];
        }
        
        document.title = `${pageTitle} | RG Studios`;
    }, [pathname]);

    return null;
}
