import { NextRequest, NextResponse } from "next/server";
import { reorderPsPrompts } from "@/lib/db";

// POST /api/promptsave/reorder — Persist new card order
export async function POST(req: NextRequest) {
    try {
        const { orderedIds } = await req.json();
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return NextResponse.json({ error: "orderedIds obrigatório" }, { status: 400 });
        }
        await reorderPsPrompts(orderedIds);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error reordering prompts:", err);
        return NextResponse.json({ error: "Erro ao reordenar" }, { status: 500 });
    }
}
