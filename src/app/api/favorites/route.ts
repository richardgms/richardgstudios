import { NextRequest, NextResponse } from "next/server";
import { toggleFavorite, getFavoriteGenerations } from "@/lib/db";
import { toImageUrl } from "@/lib/image-url";

export async function GET() {
    try {
        const favorites = await getFavoriteGenerations();

        const mapped = favorites.map((fav) => ({
            id: fav.id,
            prompt: fav.prompt,
            model: fav.model,
            aspectRatio: fav.aspect_ratio,
            resolution: fav.resolution || null,
            imageUrl: toImageUrl(fav.image_path),
            isFavorite: true,
            createdAt: fav.created_at,
            attachments: (fav as any).attachments,
        }));

        return NextResponse.json({ favorites: mapped });
    } catch (err) {
        console.error("Erro ao buscar favoritos:", err);
        return NextResponse.json(
            { error: "Erro ao buscar favoritos" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { generationId } = await req.json();

        if (!generationId) {
            return NextResponse.json(
                { error: "generationId é obrigatório" },
                { status: 400 }
            );
        }

        const isFavorite = await toggleFavorite(generationId);

        return NextResponse.json({ generationId, isFavorite });
    } catch (err) {
        console.error("Erro ao alternar favorito:", err);
        return NextResponse.json(
            { error: "Erro ao alternar favorito" },
            { status: 500 }
        );
    }
}
