import { NextRequest, NextResponse } from "next/server";
import { saveImage } from "@/lib/blob-storage";
import { updateGeneration } from "@/lib/db";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    let dataUrl: string;
    try {
        ({ dataUrl } = await req.json());
    } catch {
        return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "dataUrl inválido" }, { status: 400 });
    }

    const base64 = dataUrl.split(",")[1];
    if (!base64) return NextResponse.json({ error: "dataUrl vazio" }, { status: 400 });

    const buffer = Buffer.from(base64, "base64");
    const thumbnailUrl = await saveImage(`_thumbs/${id}.jpg`, buffer, "image/jpeg");
    await updateGeneration(id, { thumbnailUrl });

    return NextResponse.json({ thumbnailUrl });
}
