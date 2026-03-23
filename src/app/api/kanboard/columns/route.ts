import { NextRequest, NextResponse } from "next/server";
import { createKbColumn, updateKbColumn, deleteKbColumn } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { boardId, name, color } = await req.json();
    if (!boardId || !name?.trim()) {
      return NextResponse.json({ error: "boardId e name obrigatórios" }, { status: 400 });
    }
    const id = createKbColumn(boardId, name, color);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Error creating column:", err);
    return NextResponse.json({ error: "Erro ao criar coluna" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, color, wipLimit } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    updateKbColumn(id, { name, color, wipLimit });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error updating column:", err);
    return NextResponse.json({ error: "Erro ao atualizar coluna" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    deleteKbColumn(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting column:", err);
    return NextResponse.json({ error: "Erro ao excluir coluna" }, { status: 500 });
  }
}
