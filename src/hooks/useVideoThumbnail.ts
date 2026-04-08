"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Lazily extracts a thumbnail from a video URL using canvas.
 * - Uses IntersectionObserver to only trigger when visible
 * - Proxies video through /api/proxy-video to bypass CORS
 * - Persists the result to the DB via /api/generations/[id]/thumbnail
 * - On next load the stored thumbnail is used directly (no re-extraction)
 */
export function useVideoThumbnail(
    genId: string,
    videoUrl: string,
    existingThumbnail?: string | null
) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(existingThumbnail ?? null);
    const containerRef = useRef<HTMLDivElement>(null);
    const extractedRef = useRef(false);

    useEffect(() => {
        if (existingThumbnail || extractedRef.current || !videoUrl) return;

        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting || extractedRef.current) return;
                observer.disconnect();
                extractedRef.current = true;

                const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;
                const video = document.createElement("video");
                video.crossOrigin = "anonymous";
                video.preload = "metadata";
                video.muted = true;
                video.playsInline = true;
                video.src = proxyUrl;

                const cleanup = () => { video.src = ""; };

                video.addEventListener("loadedmetadata", () => {
                    video.currentTime = 0.1;
                });

                video.addEventListener("seeked", () => {
                    try {
                        const MAX_W = 640;
                        const scale = Math.min(1, MAX_W / (video.videoWidth || MAX_W));
                        const w = Math.round((video.videoWidth || MAX_W) * scale);
                        const h = Math.round((video.videoHeight || 360) * scale);
                        const canvas = document.createElement("canvas");
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
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
            },
            { rootMargin: "150px" }
        );

        observer.observe(container);
        return () => observer.disconnect();
    }, [genId, videoUrl, existingThumbnail]);

    return { thumbnailUrl, containerRef };
}
