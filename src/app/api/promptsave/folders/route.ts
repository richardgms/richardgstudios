import { NextRequest, NextResponse } from "next/server";
import { getPsFolders, createPsFolder, deletePsFolder, updatePsFolder } from "@/lib/db";

// GET /api/promptsave/folders — List all folders
export async function GET() {
    try {
        const folders = getPsFolders();
        const mapped = folders.map(f => ({
            id: f.id,
            name: f.name,
            createdAt: new Date(f.created_at).getTime(),
        }));
        return NextResponse.json({ folders: mapped });
    } catch (err) {
        console.error("Error fetching folders:", err);
        return NextResponse.json({ error: "Erro ao buscar pastas" }, { status: 500 });
    }
}

// POST /api/promptsave/folders — Create a folder
export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
        }
        const id = createPsFolder(name);
        return NextResponse.json({ id });
    } catch (err) {
        console.error("Error creating folder:", err);
        return NextResponse.json({ error: "Erro ao criar pasta" }, { status: 500 });
    }
}

// DELETE /api/promptsave/folders — Delete a folder
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
        deletePsFolder(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error deleting folder:", err);
        return NextResponse.json({ error: "Erro ao excluir pasta" }, { status: 500 });
    }
}

// PUT /api/promptsave/folders — Edit a folder
export async function PUT(req: NextRequest) {
    try {
        const { id, name } = await req.json();
        if (!id || !name?.trim()) {
            return NextResponse.json({ error: "ID e Nome são obrigatórios" }, { status: 400 });
        }
        updatePsFolder(id, name);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error updating folder:", err);
        return NextResponse.json({ error: "Erro ao editar pasta" }, { status: 500 });
    }
}
