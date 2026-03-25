import { NextRequest, NextResponse } from "next/server";
import { createKbCard, updateKbCard, deleteKbCard } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { columnId, boardId, title, description, color, priority } = await req.json();
    if (!columnId || !boardId || !title?.trim()) {
      return NextResponse.json({ error: "columnId, boardId e title obrigatórios" }, { status: 400 });
    }
    const id = await createKbCard({ columnId, boardId, title, description, color, priority });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Error creating card:", err);
    return NextResponse.json({ error: "Erro ao criar card" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, title, description, color, priority, dueDate, isCompleted, columnId, action } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    switch (action) {
      case "toggleComplete":
        await updateKbCard(id, { isCompleted: !isCompleted });
        break;
      case "move":
        if (columnId) await updateKbCard(id, { columnId });
        break;
      default:
        await updateKbCard(id, { title, description, color, priority, dueDate, isCompleted, columnId });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error updating card:", err);
    return NextResponse.json({ error: "Erro ao atualizar card" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await deleteKbCard(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting card:", err);
    return NextResponse.json({ error: "Erro ao excluir card" }, { status: 500 });
  }
}
