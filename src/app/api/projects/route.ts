import { NextRequest, NextResponse } from "next/server";
import { createProject, getProjects } from "@/lib/db";

export async function GET() {
    try {
        const projects = getProjects();
        return NextResponse.json({ projects });
    } catch (err) {
        console.error("Erro ao listar projetos:", err);
        return NextResponse.json({ error: "Erro ao listar projetos" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, description } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        const id = createProject(name.trim(), description?.trim());

        return NextResponse.json({ id, name: name.trim(), description: description?.trim() || null });
    } catch (err) {
        console.error("Erro ao criar projeto:", err);
        return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 });
    }
}
