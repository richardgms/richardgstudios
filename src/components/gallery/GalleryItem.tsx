"use client";

import { memo } from "react";
import Image from "next/image";
import { ExternalLink, Check, Video } from "lucide-react";
import { localImageLoader } from "@/lib/image-loader";

export interface GalleryItemProps {
    id: string;
    index?: number;
    imageUrl: string;
    prompt: string;
    mediaType?: "image" | "video";
    isSelected?: boolean;
    isSelectionMode?: boolean;
    onSelect?: (id: string) => void;
    onClick?: (id: string) => void;
    onPointerDown?: (id: string, e: React.PointerEvent) => void;
    onPointerUp?: () => void;
    onPointerLeave?: () => void;
    priority?: boolean;
}

function GalleryItemInner({
    id,
    index: _index,
    imageUrl,
    prompt,
    mediaType = "image",
    isSelected = false,
    isSelectionMode = false,
    onSelect,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    priority = false,
}: GalleryItemProps) {
    const isVideo = mediaType === "video" || imageUrl.endsWith(".mp4");
    const isRemoteImage = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");

    return (
        <div
            onPointerDown={(e) => onPointerDown?.(id, e)}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onClick={() => {
                if (isSelectionMode) {
                    onSelect?.(id);
                } else {
                    onClick?.(id);
                }
            }}
            style={{ contentVisibility: "auto" }}
            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-bg-glass border shadow-sm transition-transform transition-shadow duration-150 snap-center shrink-0 w-[80vw] max-w-xs md:w-auto md:max-w-none md:shrink
                ${isSelected
                    ? "border-accent scale-[0.98] ring-4 ring-accent/20 shadow-lg shadow-accent/10"
                    : "border-border-default hover:shadow-lg hover:border-accent/30 hover:-translate-y-0.5"
                }`}
        >
            {/* Thumbnail via custom loader — sharp compresses to WebP */}
            <Image
                loader={isRemoteImage ? undefined : localImageLoader}
                src={imageUrl}
                alt={prompt.slice(0, 40)}
                fill
                sizes="(max-width: 768px) 80vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className={`object-cover transition-transform duration-300 ${isSelectionMode && !isSelected ? "opacity-60 grayscale-[50%]" : "group-hover:scale-105"
                    }`}
                priority={priority}
            />

            {/* Video Indicator (Shield Anti-mp4-download) */}
            {isVideo && (
                <div className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 z-10">
                    <Video className="w-3 h-3 text-white" />
                </div>
            )}

            {/* Hover overlay with prompt */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                <p className="text-[10px] text-white/90 line-clamp-2 leading-relaxed">
                    {prompt}
                </p>
            </div>

            {/* Open icon */}
            {!isSelectionMode && (
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <ExternalLink className="w-3 h-3" />
                </div>
            )}

            {/* Selected Indicator Overlay */}
            {isSelected && (
                <div className="absolute top-2 left-2 p-1.5 rounded-full bg-accent text-white shadow-xl ring-2 ring-white/20 animate-in zoom-in-50 duration-200 z-20">
                    <Check className="w-3.5 h-3.5" />
                </div>
            )}

            {/* Hover overlay for selection mode (if not selected) */}
            {isSelectionMode && !isSelected && (
                <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 border border-white/50 text-white/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                    <div className="w-3.5 h-3.5 rounded-full" />
                </div>
            )}
        </div>
    );
}

// Memoized custom component to prevent re-renders when other items change
export const GalleryItem = memo(GalleryItemInner, (prev, next) => {
    return (
        prev.id === next.id &&
        prev.imageUrl === next.imageUrl &&
        prev.isSelected === next.isSelected &&
        prev.isSelectionMode === next.isSelectionMode &&
        prev.mediaType === next.mediaType &&
        prev.prompt === next.prompt
    );
});
