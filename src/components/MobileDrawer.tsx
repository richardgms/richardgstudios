"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, GripHorizontal } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
    STUDIO_ITEMS,
    PS_ITEMS,
    KB_ITEMS,
    type ModuleKey,
    type PsSection,
    type KbSection,
} from "@/lib/nav-config";

interface MobileDrawerProps {
    module: ModuleKey;
}

/** Mapa de tema de cor por módulo. */
const MODULE_THEME: Record<ModuleKey, string> = {
    studio:     "bg-accent/15 text-accent-light border-accent/30",
    promptsave: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    kanboard:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const MODULE_LABEL: Record<ModuleKey, string> = {
    studio:     "Studio",
    promptsave: "Vault",
    kanboard:   "KanBoard",
};

/**
 * MobileDrawer — painel de navegação lateral para mobile.
 *
 * - z-[65]: acima dos dropdowns de conteúdo (z-60), abaixo dos modais (z-100)
 * - Drag-to-close restrito ao handle (evita conflito com scroll da lista interna)
 * - Scroll lock counter-based via data-drawer-count no body (useLayoutEffect)
 * - Fecha ao mudar de pathname, ao pressionar Escape e ao clicar no backdrop
 * - Exclusão mútua com ChatPanel
 * - Navegação polimórfica: type:'url' → <Link>, type:'action' → <button>
 */
export function MobileDrawer({ module }: MobileDrawerProps) {
    const pathname     = usePathname();
    const dragControls = useDragControls();
    const firstItemRef = useRef<HTMLElement | null>(null);

    // ─── Store slices (todos chamados incondicionalmente — regra de hooks) ────
    const isOpen              = useAppStore((s) => s.mobileDrawerOpen);
    const setMobileDrawerOpen = useAppStore((s) => s.setMobileDrawerOpen);
    const psActiveSection     = useAppStore((s) => s.psActiveSection);
    const setPsActiveSection  = useAppStore((s) => s.setPsActiveSection);
    const psPromptCount       = useAppStore((s) => s.psPromptCount);
    const kbActiveSection     = useAppStore((s) => s.kbActiveSection);
    const setKbActiveSection  = useAppStore((s) => s.setKbActiveSection);
    const kbBoardCount        = useAppStore((s) => s.kbBoardCount);
    const close = () => setMobileDrawerOpen(false);

    // ─── Fechar ao navegar ────────────────────────────────────────────────────
    useEffect(() => {
        setMobileDrawerOpen(false);
    // pathname como dep: fecha ao trocar de rota
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // ─── Scroll lock counter-based ────────────────────────────────────────────
    // useLayoutEffect garante cleanup síncrono antes do unmount,
    // prevenindo race condition em navegações rápidas.
    useLayoutEffect(() => {
        if (!isOpen) return;
        const body = document.body;
        const prev = parseInt(body.dataset.drawerCount ?? "0", 10);
        body.dataset.drawerCount = String(prev + 1);
        return () => {
            const curr = parseInt(body.dataset.drawerCount ?? "0", 10);
            body.dataset.drawerCount = String(Math.max(0, curr - 1));
        };
    }, [isOpen]);

    // ─── Escape key ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ─── Focus primeiro item ao abrir ─────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const id = setTimeout(() => firstItemRef.current?.focus(), 60);
        return () => clearTimeout(id);
    }, [isOpen]);

    // ─── Drag-to-close ────────────────────────────────────────────────────────
    const handleDragEnd = (_: unknown, info: { velocity: { x: number }; offset: { x: number } }) => {
        // Fecha se swipe rápido para esquerda OU deslocamento > 80px para esquerda
        if (info.velocity.x < -400 || info.offset.x < -80) close();
    };

    // ─── Helpers de active state e badge ─────────────────────────────────────
    const isActive = (item: (typeof STUDIO_ITEMS)[0] | (typeof PS_ITEMS)[0] | (typeof KB_ITEMS)[0]): boolean => {
        if (item.type === "url") {
            return pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        }
        if (module === "promptsave") return psActiveSection === (item as typeof PS_ITEMS[0]).id;
        if (module === "kanboard")   return kbActiveSection  === (item as typeof KB_ITEMS[0]).id;
        return false;
    };

    const getBadgeCount = (item: (typeof PS_ITEMS)[0] | (typeof KB_ITEMS)[0]): number | null => {
        if (!item.showBadge) return null;
        if (module === "promptsave") return psPromptCount > 0 ? psPromptCount : null;
        if (module === "kanboard")   return kbBoardCount  > 0 ? kbBoardCount  : null;
        return null;
    };

    const items = module === "studio"     ? STUDIO_ITEMS
                : module === "promptsave" ? PS_ITEMS
                : KB_ITEMS;

    const theme = MODULE_THEME[module];

    const itemBase =
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border min-h-11";
    const itemIdle =
        "text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-glass-hover";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Backdrop ─────────────────────────────────────────── */}
                    <motion.div
                        key="drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[64] bg-black/60 md:hidden"
                        aria-hidden="true"
                        onClick={close}
                    />

                    {/* ── Painel ───────────────────────────────────────────── */}
                    <motion.aside
                        key="drawer-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Menu de navegação — ${MODULE_LABEL[module]}`}
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        drag="x"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.35, right: 0 }}
                        onDragEnd={handleDragEnd}
                        className="fixed left-0 top-0 bottom-0 z-[65] flex flex-col w-72 bg-bg-surface border-r border-border-default shadow-2xl md:hidden"
                        style={{ touchAction: "pan-y" }}
                    >
                        {/* Handle de drag — único ponto de captura do gesto */}
                        <div
                            className="flex items-center justify-center h-8 cursor-grab active:cursor-grabbing shrink-0 pt-2"
                            onPointerDown={(e) => dragControls.start(e)}
                            aria-hidden="true"
                        >
                            <GripHorizontal className="w-5 h-5 text-text-muted/40" />
                        </div>

                        {/* Header interno */}
                        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                                {MODULE_LABEL[module]}
                            </span>
                            <button
                                onClick={close}
                                aria-label="Fechar menu"
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-glass-hover transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Lista de navegação — scrollável internamente */}
                        <nav
                            className="flex-1 overflow-y-auto px-2 pb-6 space-y-0.5"
                            aria-label="Navegação do módulo"
                        >
                            {items.map((item, index) => {
                                const Icon   = item.icon;
                                const active = isActive(item as Parameters<typeof isActive>[0]);

                                if (item.type === "url") {
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={close}
                                            className={`${itemBase} ${active ? `${theme} border` : itemIdle}`}
                                            ref={index === 0
                                                ? (el: HTMLAnchorElement | null) => { firstItemRef.current = el; }
                                                : undefined
                                            }
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            {item.label}
                                        </Link>
                                    );
                                }

                                // type: 'action' — PS ou KB
                                const actionItem = item as typeof PS_ITEMS[0] | typeof KB_ITEMS[0];
                                const badge      = getBadgeCount(actionItem);

                                const handleAction = () => {
                                    if (module === "promptsave") setPsActiveSection(actionItem.id as PsSection);
                                    if (module === "kanboard")   setKbActiveSection(actionItem.id as KbSection);
                                    close();
                                };

                                return (
                                    <button
                                        key={actionItem.id}
                                        onClick={handleAction}
                                        className={`${itemBase} ${active ? `${theme} border` : itemIdle}`}
                                        ref={index === 0
                                            ? (el: HTMLButtonElement | null) => { firstItemRef.current = el; }
                                            : undefined
                                        }
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        {actionItem.label}
                                        {badge !== null && (
                                            <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                active
                                                    ? "bg-bg-glass border-current/20"
                                                    : "bg-bg-glass border-border-default text-text-muted"
                                            }`}>
                                                {badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
