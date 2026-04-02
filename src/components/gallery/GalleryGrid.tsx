"use client";

import { ReactNode } from "react";

interface GalleryGridProps {
    children: ReactNode;
    variant?: "default" | "compact";
}

export function GalleryGrid({ children, variant = "default" }: GalleryGridProps) {
    if (variant === "compact") {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {children}
            </div>
        );
    }

    return (
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 md:grid md:mx-0 md:px-0 md:overflow-x-visible md:snap-none md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {children}
        </div>
    );
}
