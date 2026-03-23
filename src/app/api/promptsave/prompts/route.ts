import { NextRequest, NextResponse } from "next/server";
import { getPsPrompts, createPsPrompt, updatePsPrompt, togglePsPromptFavorite, softDeletePsPrompt, restorePsPrompt, hardDeletePsPrompt } from "@/lib/db";

// GET /api/promptsave/prompts — List all prompts
export async function GET() {
    try {
        const prompts = getPsPrompts();
        // Map DB columns to camelCase for frontend
        const mapped = prompts.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content,
            folderId: p.folder_id,
            color: p.color,
            isFavorite: p.is_favorite === 1,
            isDeleted: p.is_deleted === 1,
            createdAt: new Date(p.created_at).getTime(),
        }));
        return NextResponse.json({ prompts: mapped });
    } catch (err) {
        console.error("Error fetching prompts:", err);
        return NextResponse.json({ error: "Erro ao buscar prompts" }, { status: 500 });
    }
}

// POST /api/promptsave/prompts — Create a prompt
export async function POST(req: NextRequest) {
    try {
        const { title, content, folderId, color } = await req.json();
        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: "Título e conteúdo são obrigatórios" }, { status: 400 });
        }
        const id = createPsPrompt({ title, content, folderId: folderId || null, color: color || "bg-blue-500" });
        return NextResponse.json({ id });
    } catch (err) {
        console.error("Error creating prompt:", err);
        return NextResponse.json({ error: "Erro ao criar prompt" }, { status: 500 });
    }
}

// PUT /api/promptsave/prompts — Update a prompt
export async function PUT(req: NextRequest) {
    try {
        const { id, title, content, folderId, color, isFavorite, isDeleted, action } = await req.json();
        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

        switch (action) {
            case "toggleFavorite":
                togglePsPromptFavorite(id);
                break;
            case "softDelete":
                softDeletePsPrompt(id);
                break;
            case "restore":
                restorePsPrompt(id);
                break;
            default:
                // Full update
                if (!title?.trim() || !content?.trim()) {
                    return NextResponse.json({ error: "Título e conteúdo obrigatórios" }, { status: 400 });
                }
                updatePsPrompt(id, { title, content, folderId: folderId || null, color, isFavorite, isDeleted });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error updating prompt:", err);
        return NextResponse.json({ error: "Erro ao atualizar prompt" }, { status: 500 });
    }
}

// DELETE /api/promptsave/prompts — Hard delete a prompt
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
        hardDeletePsPrompt(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error deleting prompt:", err);
        return NextResponse.json({ error: "Erro ao excluir prompt" }, { status: 500 });
    }
}
