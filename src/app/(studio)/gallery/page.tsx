import { getGenerations } from "@/lib/db";
import { GalleryClient } from "./gallery-client";

// Revalidar sob demanda ou cache behavior conforme nextjs best practices
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
    // Phase 1: Server Side Fetching (Secure DB fetching locally)
    const rawGenerations = await getGenerations(50, 0);
    // libsql retorna Row objects (com métodos) — serializar para plain objects antes de passar ao Client
    const initialGenerations = JSON.parse(JSON.stringify(rawGenerations)) as any[];

    // Log para depurar duplicate keys
    console.log("Gallery IDs:", initialGenerations.map(g => g.id));

    return (
        <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="font-display font-bold text-2xl text-text-primary">Galeria</h1>
                <p className="text-sm text-text-secondary mt-1">
                    Todas as imagens geradas no Nano Banana Studio.
                </p>
            </div>

            {/* Phase 2/3: Layout with Skeleton, Prompt Modal, Next Image */}
            <GalleryClient initialGenerations={initialGenerations} />
        </div>
    );
}
