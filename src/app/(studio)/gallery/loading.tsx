export default function Loading() {
    return (
        <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
            <div className="mb-8">
                <div className="h-8 w-48 bg-bg-surface rounded-lg animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-bg-surface-hover rounded-lg animate-pulse"></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="glass-card overflow-hidden flex flex-col gap-2 p-3">
                        <div className="aspect-square bg-bg-surface rounded-lg animate-pulse w-full"></div>
                        <div className="h-8 w-full bg-bg-surface-hover rounded animate-pulse mt-1"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
