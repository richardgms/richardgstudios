import { NextRequest, NextResponse } from "next/server";
import { getKbCard } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const card = getKbCard(id);
    if (!card) return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });

    return NextResponse.json({
      id: card.id,
      columnId: card.column_id,
      boardId: card.board_id,
      title: card.title,
      description: card.description,
      color: card.color,
      priority: card.priority,
      dueDate: card.due_date,
      isCompleted: card.is_completed === 1,
      sortOrder: card.sort_order,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      checklist: card.checklist.map((c: Record<string, unknown>) => ({
        id: c.id,
        text: c.text,
        isChecked: c.is_checked === 1,
        sortOrder: c.sort_order,
      })),
      labels: card.labels.map((l: Record<string, unknown>) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
    });
  } catch (err) {
    console.error("Error fetching card:", err);
    return NextResponse.json({ error: "Erro ao buscar card" }, { status: 500 });
  }
}
