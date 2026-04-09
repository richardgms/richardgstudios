"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Shared IntersectionObserver instance to avoid overhead of multiple observers.
 */
let sharedObserver: IntersectionObserver | null = null;
const observerCallbacks = new WeakMap<Element, () => void>();

function getSharedObserver() {
    if (typeof window === "undefined") return null;
    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const callback = observerCallbacks.get(entry.target);
                        if (callback) {
                            callback();
                            // Optional: disconnect if we only need to trigger once
                            // but usually the hook handles it by disconnecting the specific element
                        }
                    }
                });
            },
            { rootMargin: "200px" } // Margem generosa para carregar antes de aparecer
        );
    }
    return sharedObserver;
}

/**
 * Lazily extracts a thumbnail from a video URL using canvas.
 * - Uses a SHARED IntersectionObserver to reduce overhead.
 * - Throttles extraction to avoid processing during rapid scroll.
 * - Proxies video through /api/proxy-video to bypass CORS.
 * - Persists the result to the DB via /api/generations/[id]/thumbnail.
 */
export function useVideoThumbnail(
    genId: string,
    videoUrl: string,
    existingThumbnail?: string | null
) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(existingThumbnail ?? null);
    const containerRef = useRef<HTMLDivElement>(null);
    const extractedRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (existingThumbnail || extractedRef.current || !videoUrl) return;

        const container = containerRef.current;
        if (!container) return;

        const observer = getSharedObserver();
        if (!observer) return;

        const startExtraction = () => {
            if (extractedRef.current) return;
            
            // Debounce: Wait 300ms of visibility before processing
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            timeoutRef.current = setTimeout(() => {
                if (extractedRef.current) return;
                extractedRef.current = true;
                
                // Final disconnect for this element
                observer.unobserve(container);
                observerCallbacks.delete(container);

                const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;
                const video = document.createElement("video");
                video.crossOrigin = "anonymous";
                video.preload = "metadata";
                video.muted = true;
                video.playsInline = true;
                video.src = proxyUrl;

                const cleanup = () => { 
                    video.src = ""; 
                    video.load(); // Force release resources
                };

                video.addEventListener("loadedmetadata", () => {
                    video.currentTime = 0.1;
                });

                video.addEventListener("seeked", () => {
                    try {
                        const MAX_W = 480; // Reduzido de 640 para 480 (performance)
                        const scale = Math.min(1, MAX_W / (video.videoWidth || MAX_W));
                        const w = Math.round((video.videoWidth || MAX_W) * scale);
                        const h = Math.round((video.videoHeight || 360) * scale);
                        
                        const canvas = document.createElement("canvas");
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext("2d", { alpha: false }); // Optmization: no alpha
                        ctx?.drawImage(video, 0, 0, w, h);
                        
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.7); // Reduzido qualidade de 0.75 para 0.7
                        setThumbnailUrl(dataUrl);
                        cleanup();
                        
                        fetch(`/api/generations/${genId}/thumbnail`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dataUrl }),
                        }).catch(() => {});
                    } catch {
                        cleanup();
                    }
                });

                video.addEventListener("error", cleanup);
            }, 300);
        };

        observerCallbacks.set(container, startExtraction);
        observer.observe(container);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            observer.unobserve(container);
            observerCallbacks.delete(container);
        };
    }, [genId, videoUrl, existingThumbnail]);

    return { thumbnailUrl, containerRef };
}
