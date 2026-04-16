import { NextRequest, NextResponse } from "next/server";
import { getBrandKitsWithStats, createBrandKit } from "@/lib/db";
import { brandAssetProxyUrl } from "@/lib/blob-storage";

export async function GET() {
    try {
        const brands = await getBrandKitsWithStats();

        const results = brands.map((brand) => ({
            ...brand,
            thumbnail: brand.thumbnail_r2_key ? brandAssetProxyUrl(brand.thumbnail_r2_key) : null,
        }));

        return NextResponse.json({ brands: results });
    } catch {
        return NextResponse.json({ error: "Falha ao buscar marcas" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, segment, primary_color, secondary_color, accent_color,
                primary_font, secondary_font, visual_style, tone_of_voice, extra_notes } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Nome da marca é obrigatório" }, { status: 400 });
        }

        const id = await createBrandKit({
            name: name.trim(),
            description: description?.trim() || undefined,
            segment: segment?.trim() || undefined,
            primary_color: primary_color?.trim() || undefined,
            secondary_color: secondary_color?.trim() || undefined,
            accent_color: accent_color?.trim() || undefined,
            primary_font: primary_font?.trim() || undefined,
            secondary_font: secondary_font?.trim() || undefined,
            visual_style: visual_style?.trim() || undefined,
            tone_of_voice: tone_of_voice?.trim() || undefined,
            extra_notes: extra_notes?.trim() || undefined,
        });

        return NextResponse.json({ id, name: name.trim() }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Falha ao criar marca" }, { status: 500 });
    }
}
