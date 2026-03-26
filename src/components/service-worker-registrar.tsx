"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Nunca registra SW em desenvolvimento — quebra HMR e cacheia bundles antigos
    if (process.env.NODE_ENV === "development") {
      // Se já existe um SW registrado de uma sessão anterior, remove
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("[SW] Registrado com sucesso, scope:", reg.scope);
      } catch (err) {
        console.warn("[SW] Registro falhou:", err);
      }
    };

    // Registra após o page load para não bloquear LCP
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
