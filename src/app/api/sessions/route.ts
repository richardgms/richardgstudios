import { NextRequest, NextResponse } from "next/server";
import { createSession, getSessions } from "@/lib/db";

export async function GET() {
    try {
        const sessions = await getSessions();
        return NextResponse.json({ sessions });
    } catch (err) {
        console.error("Erro ao listar sessões:", err);
        return NextResponse.json({ error: "Erro ao listar sessões" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        const id = await createSession(name.trim());

        return NextResponse.json({ id, name: name.trim() });
    } catch (err) {
        console.error("Erro ao criar sessão:", err);
        return NextResponse.json({ error: "Erro ao criar sessão" }, { status: 500 });
    }
}
