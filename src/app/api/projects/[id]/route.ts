import { NextRequest, NextResponse } from "next/server";
import { getProjectWithGenerations, updateProject, deleteProject } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const project = await getProjectWithGenerations(id);

        if (!project) {
            return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
        }

        const mapped = {
            ...project,
            generations: project.generations.map((g: any) => ({
                ...g,
                imageUrl: g.image_path.startsWith('/api/images/') ? g.image_path : `/api/images/${g.image_path.replace("storage/", "")}`,
                aspectRatio: g.aspect_ratio,
            })),
        };

        return NextResponse.json(mapped);
    } catch (err) {
        console.error("Erro ao buscar projeto:", err);
        return NextResponse.json({ error: "Erro ao buscar projeto" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { name, description } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        await updateProject(id, name.trim(), description?.trim());

        return NextResponse.json({ id, name: name.trim(), description: description?.trim() || null });
    } catch (err) {
        console.error("Erro ao atualizar projeto:", err);
        return NextResponse.json({ error: "Erro ao atualizar projeto" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { deleteProject } = await import("@/lib/db");
        await deleteProject(id); // This now calls softDelete internally in db.ts
        return NextResponse.json({ deleted: true });
    } catch (err) {
        console.error("Erro ao deletar projeto:", err);
        return NextResponse.json({ error: "Erro ao deletar projeto" }, { status: 500 });
    }
}
