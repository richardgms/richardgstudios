import { NextRequest, NextResponse } from "next/server";
import { getSessionWithGenerations, deleteSession, updateSession } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = getSessionWithGenerations(id);

        if (!session) {
            return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
        }

        const mapped = {
            ...session,
            generations: session.generations.map((g) => ({
                ...g,
                imageUrl: g.image_path.startsWith('/api/images/') ? g.image_path : `/api/images/${g.image_path.replace("storage/", "")}`,
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

        updateSession(id, name.trim());
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
        softDelete("sessions", id);
        return NextResponse.json({ deleted: true });
    } catch (err) {
        console.error("Erro ao deletar sessão:", err);
        return NextResponse.json({ error: "Erro ao deletar sessão" }, { status: 500 });
    }
}
