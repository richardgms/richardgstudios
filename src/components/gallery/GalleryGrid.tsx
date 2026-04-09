"use client";

import { forwardRef } from "react";

// Componente List que o Virtuoso usará para o grid (mantém as classes responsivas do Tailwind)
export const GalleryGridList = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ style, children, ...props }, ref) => (
        <div
            ref={ref}
            {...props}
            style={{ ...style }}
            className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
            {children}
        </div>
    )
);
GalleryGridList.displayName = "GalleryGridList";

// Componente Item Wrapper do grid virtualizado
export const GalleryGridItem = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
            {children}
        </div>
    )
);
GalleryGridItem.displayName = "GalleryGridItem";
