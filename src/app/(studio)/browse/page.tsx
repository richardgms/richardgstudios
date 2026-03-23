"use client";

import { Suspense } from "react";
import { BrowseContent } from "./browse-content";

export default function BrowsePage() {
    return (
        <Suspense
            fallback={
                <div className="p-8 max-w-7xl mx-auto space-y-6">
                    <div className="space-y-1">
                        <div className="h-8 bg-bg-surface rounded w-48 animate-pulse" />
                        <div className="h-4 bg-bg-surface rounded w-32 animate-pulse" />
                    </div>
                    <div className="h-12 bg-bg-surface rounded-xl animate-pulse" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="glass-card animate-pulse">
                                <div className="aspect-[4/3] bg-bg-surface rounded-t-[16px]" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 bg-bg-surface rounded w-3/4" />
                                    <div className="h-3 bg-bg-surface rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            }
        >
            <BrowseContent />
        </Suspense>
    );
}
