import { NextRequest, NextResponse } from "next/server";
import { moveGenerationToProject, getProjectById } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { generationId, action } = await req.json();

        if (!generationId) {
            return NextResponse.json({ error: "generationId é obrigatório" }, { status: 400 });
        }

        // Verificar se o projeto existe
        const project = await getProjectById(id);
        if (!project) {
            return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
        }

        if (action === "remove") {
            // Desvincular geração do projeto
            await moveGenerationToProject(generationId, null);
            return NextResponse.json({ generationId, projectId: null, action: "removed" });
        }

        // Vincular geração ao projeto
        await moveGenerationToProject(generationId, id);
        return NextResponse.json({ generationId, projectId: id, action: "added" });
    } catch (err) {
        console.error("Erro ao vincular geração:", err);
        return NextResponse.json({ error: "Erro ao vincular geração" }, { status: 500 });
    }
}
