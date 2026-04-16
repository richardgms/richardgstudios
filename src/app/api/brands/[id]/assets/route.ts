import { NextRequest, NextResponse } from "next/server";
import { getBrandKit, createBrandKitAsset } from "@/lib/db";
import { saveBrandAsset, compressToWebP, brandAssetProxyUrl } from "@/lib/blob-storage";
import { v4 as uuidv4 } from "uuid";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: brandId } = await params;

        const brand = await getBrandKit(brandId);
        if (!brand) {
            return NextResponse.json({ error: "Marca não encontrada" }, { status: 404 });
        }

        const formData = await req.formData();
        const title = (formData.get("title") as string | null)?.trim();
        const description = (formData.get("description") as string | null)?.trim() || undefined;
        const imageFile = formData.get("image") as File | null;

        if (!title) {
            return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
        }
        if (!imageFile) {
            return NextResponse.json({ error: "Imagem é obrigatória" }, { status: 400 });
        }

        const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20MB raw upload limit
        if (imageFile.size > MAX_INPUT_BYTES) {
            return NextResponse.json({ error: "Imagem muito grande (máx. 20MB)" }, { status: 413 });
        }

        const fileId = uuidv4();
        const r2Key = `brands/${brandId}/${fileId}.webp`;

        const rawBuffer = Buffer.from(await imageFile.arrayBuffer());
        const compressed = await compressToWebP(rawBuffer, 800 * 1024);

        await saveBrandAsset(r2Key, compressed);
        const dbId = await createBrandKitAsset({ brand_id: brandId, title, description, r2_key: r2Key });

        return NextResponse.json({
            id: dbId,
            brand_id: brandId,
            title,
            description: description ?? null,
            r2_key: r2Key,
            proxy_url: brandAssetProxyUrl(r2Key),
            size_bytes: compressed.byteLength,
        }, { status: 201 });
    } catch (err) {
        console.error("[brands/assets] Erro:", err);
        return NextResponse.json({ error: "Falha ao salvar asset" }, { status: 500 });
    }
}
