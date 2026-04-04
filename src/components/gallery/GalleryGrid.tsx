"use client";

import { ReactNode } from "react";

interface GalleryGridProps {
    children: ReactNode;
}

export function GalleryGrid({ children }: GalleryGridProps) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {children}
        </div>
    );
}
