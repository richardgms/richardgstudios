"use client";

import { useEffect, useState } from "react";

const VVP_OFFSET_VAR = "--vvp-offset";

/**
 * Gerencia a compensação do teclado virtual mobile.
 *
 * Comportamento duplo:
 *   1. Injeta `--vvp-offset` no :root com o delta entre o layout viewport
 *      (window.innerHeight) e o visual viewport (visualViewport.height).
 *      No desktop e mobile sem teclado: delta = 0 → sem impacto.
 *      Com teclado aberto: delta = altura do teclado.
 *
 *   2. Retorna a altura do visual viewport (number | null) para consumers
 *      que necessitem do valor bruto.
 *
 * Uso correto no container da página:
 *   style={{ height: "calc(100% - var(--vvp-offset, 0px))" }}
 *   → Usa 100% do pai (correto, descontando MobilePageHeader ou qualquer
 *     elemento acima do <main>), depois subtrai apenas a altura do teclado.
 *
 * Anti-pattern anterior (não usar):
 *   style={{ height: `${vpHeight}px` }}
 *   → Usava o viewport total, ignorando elementos do layout acima de <main>,
 *     causando overflow no mobile.
 *
 * Suporte: iOS Safari 13+, Android Chrome 62+, Firefox 91+.
 * Browsers sem suporte: delta permanece 0 (graceful degradation).
 */
export function useVisualViewport(): number | null {
    const [height, setHeight] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;

        const vv = window.visualViewport;

        const update = () => {
            const delta = Math.max(0, window.innerHeight - vv.height);
            document.documentElement.style.setProperty(VVP_OFFSET_VAR, `${delta}px`);
            setHeight(vv.height);
        };

        update(); // valor inicial pós-hidratação

        vv.addEventListener("resize", update);

        return () => {
            vv.removeEventListener("resize", update);
            // Cleanup: reset ao navegar para outra página para evitar
            // que o offset residual afete outros consumers.
            document.documentElement.style.setProperty(VVP_OFFSET_VAR, "0px");
        };
    }, []);

    return height;
}
