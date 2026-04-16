import { NextRequest, NextResponse } from "next/server";
import { getBrandKit, getBrandKitAssets, updateBrandKit, softDeleteBrandKit } from "@/lib/db";
import { brandAssetProxyUrl } from "@/lib/blob-storage";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const brand = await getBrandKit(id);
        if (!brand) {
            return NextResponse.json({ error: "Marca não encontrada" }, { status: 404 });
        }

        const assets = await getBrandKitAssets(id);
        const assetsWithUrl = assets.map((a) => ({
            ...a,
            proxy_url: brandAssetProxyUrl(a.r2_key),
        }));

        return NextResponse.json({ ...brand, assets: assetsWithUrl });
    } catch {
        return NextResponse.json({ error: "Falha ao buscar marca" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const brand = await getBrandKit(id);
        if (!brand) {
            return NextResponse.json({ error: "Marca não encontrada" }, { status: 404 });
        }

        const body = await req.json();
        const allowed = [
            "name", "description", "segment", "primary_color", "secondary_color",
            "accent_color", "primary_font", "secondary_font", "visual_style",
            "tone_of_voice", "extra_notes",
        ] as const;

        const updates: Record<string, string | null> = {};
        for (const key of allowed) {
            if (key in body) {
                updates[key] = typeof body[key] === "string" ? body[key].trim() || null : null;
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
        }

        if ("name" in updates && !updates.name) {
            return NextResponse.json({ error: "Nome da marca é obrigatório" }, { status: 400 });
        }

        await updateBrandKit(id, updates as Parameters<typeof updateBrandKit>[1]);
        return NextResponse.json({ updated: true });
    } catch {
        return NextResponse.json({ error: "Falha ao atualizar marca" }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const brand = await getBrandKit(id);
        if (!brand) {
            return NextResponse.json({ error: "Marca não encontrada" }, { status: 404 });
        }

        await softDeleteBrandKit(id);
        return NextResponse.json({ deleted: true });
    } catch {
        return NextResponse.json({ error: "Falha ao deletar marca" }, { status: 500 });
    }
}
