import { NextRequest, NextResponse } from "next/server";
import { getBrandKitAssets, deleteBrandKitAsset } from "@/lib/db";
import { deleteBrandAsset } from "@/lib/blob-storage";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; assetId: string }> }
) {
    try {
        const { id: brandId, assetId } = await params;

        const assets = await getBrandKitAssets(brandId);
        const asset = assets.find((a) => a.id === assetId);

        if (!asset) {
            return NextResponse.json({ error: "Asset não encontrado" }, { status: 404 });
        }

        await deleteBrandKitAsset(assetId);
        await deleteBrandAsset(asset.r2_key);

        return NextResponse.json({ deleted: true });
    } catch (err) {
        console.error("[brands/assets/delete] Erro:", err);
        return NextResponse.json({ error: "Falha ao deletar asset" }, { status: 500 });
    }
}
