import { NextRequest, NextResponse } from "next/server";
import { getKbBoard, updateKbBoard, toggleKbBoardFavorite, softDeleteKbBoard, restoreKbBoard, hardDeleteKbBoard } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getKbBoard(id);
    if (!data) return NextResponse.json({ error: "Quadro não encontrado" }, { status: 404 });

    const { board, columns, cards, labels, cardLabels } = data;
    return NextResponse.json({
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        color: board.color,
        isFavorite: board.is_favorite === 1,
        isDeleted: board.is_deleted === 1,
        createdAt: board.created_at,
        updatedAt: board.updated_at,
      },
      columns: columns.map((c: Record<string, unknown>) => ({
        id: c.id,
        boardId: c.board_id,
        name: c.name,
        color: c.color,
        wipLimit: c.wip_limit,
        sortOrder: c.sort_order,
      })),
      cards: cards.map((c: Record<string, unknown>) => ({
        id: c.id,
        columnId: c.column_id,
        boardId: c.board_id,
        title: c.title,
        description: c.description,
        color: c.color,
        priority: c.priority,
        dueDate: c.due_date,
        isCompleted: c.is_completed === 1,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      labels: labels.map((l: Record<string, unknown>) => ({
        id: l.id,
        boardId: l.board_id,
        name: l.name,
        color: l.color,
      })),
      cardLabels: cardLabels.map((cl: Record<string, unknown>) => ({
        cardId: cl.card_id,
        labelId: cl.label_id,
      })),
    });
  } catch (err) {
    console.error("Error fetching board:", err);
    return NextResponse.json({ error: "Erro ao buscar quadro" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action, name, description, color } = await req.json();

    switch (action) {
      case "toggleFavorite":
        await toggleKbBoardFavorite(id);
        break;
      case "softDelete":
        await softDeleteKbBoard(id);
        break;
      case "restore":
        await restoreKbBoard(id);
        break;
      default:
        await updateKbBoard(id, { name, description, color });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error updating board:", err);
    return NextResponse.json({ error: "Erro ao atualizar quadro" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await hardDeleteKbBoard(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting board:", err);
    return NextResponse.json({ error: "Erro ao excluir quadro" }, { status: 500 });
  }
}
