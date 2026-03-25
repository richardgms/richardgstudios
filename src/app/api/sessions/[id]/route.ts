import { NextRequest, NextResponse } from "next/server";
import { getSessionWithGenerations, deleteSession, updateSession } from "@/lib/db";
import { toImageUrl } from "@/lib/image-url";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSessionWithGenerations(id);

        if (!session) {
            return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
        }

        const mapped = {
            ...session,
            generations: session.generations.map((g: any) => ({
                ...g,
                imageUrl: toImageUrl(g.image_path),
                aspectRatio: g.aspect_ratio,
                attachments: (g as any).attachments,
            })),
        };

        return NextResponse.json(mapped);
    } catch (err) {
        console.error("Erro ao buscar sessão:", err);
        return NextResponse.json({ error: "Erro ao buscar sessão" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
        }

        await updateSession(id, name.trim());
        return NextResponse.json({ id, name: name.trim() });
    } catch (err) {
        console.error("Erro ao atualizar sessão:", err);
        return NextResponse.json({ error: "Erro ao atualizar sessão" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { softDelete } = await import("@/lib/db");
        await softDelete("sessions", id);
        return NextResponse.json({ deleted: true });
    } catch (err) {
        console.error("Erro ao deletar sessão:", err);
        return NextResponse.json({ error: "Erro ao deletar sessão" }, { status: 500 });
    }
}
