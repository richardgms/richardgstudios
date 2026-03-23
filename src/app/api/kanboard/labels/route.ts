import { NextRequest, NextResponse } from "next/server";
import { getKbLabels, createKbLabel, updateKbLabel, deleteKbLabel, toggleKbCardLabel } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");
    if (!boardId) return NextResponse.json({ error: "boardId obrigatório" }, { status: 400 });
    const labels = getKbLabels(boardId);
    return NextResponse.json({
      labels: labels.map(l => ({
        id: l.id,
        boardId: l.board_id,
        name: l.name,
        color: l.color,
      }))
    });
  } catch (err) {
    console.error("Error fetching labels:", err);
    return NextResponse.json({ error: "Erro ao buscar labels" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { boardId, name, color, action, cardId, labelId } = await req.json();

    if (action === "toggle") {
      if (!cardId || !labelId) return NextResponse.json({ error: "cardId e labelId obrigatórios" }, { status: 400 });
      toggleKbCardLabel(cardId, labelId);
      return NextResponse.json({ ok: true });
    }

    if (!boardId || !name?.trim() || !color) {
      return NextResponse.json({ error: "boardId, name e color obrigatórios" }, { status: 400 });
    }
    const id = createKbLabel(boardId, name, color);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Error creating label:", err);
    return NextResponse.json({ error: "Erro ao criar label" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, color } = await req.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    updateKbLabel(id, { name, color });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error updating label:", err);
    return NextResponse.json({ error: "Erro ao atualizar label" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    deleteKbLabel(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting label:", err);
    return NextResponse.json({ error: "Erro ao excluir label" }, { status: 500 });
  }
}
