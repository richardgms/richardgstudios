import { NextRequest, NextResponse } from "next/server";
import { createKbChecklistItem, updateKbChecklistItem, deleteKbChecklistItem, toggleKbChecklistItem } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { cardId, text, action, id: itemId } = await req.json();

    if (action === "toggle") {
      if (!itemId) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
      await toggleKbChecklistItem(itemId);
      return NextResponse.json({ ok: true });
    }

    if (!cardId || !text?.trim()) {
      return NextResponse.json({ error: "cardId e text obrigatórios" }, { status: 400 });
    }
    const id = await createKbChecklistItem(cardId, text);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Error with checklist:", err);
    return NextResponse.json({ error: "Erro no checklist" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, text, isChecked } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await updateKbChecklistItem(id, { text, isChecked });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error updating checklist:", err);
    return NextResponse.json({ error: "Erro ao atualizar checklist" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await deleteKbChecklistItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting checklist item:", err);
    return NextResponse.json({ error: "Erro ao excluir item" }, { status: 500 });
  }
}
