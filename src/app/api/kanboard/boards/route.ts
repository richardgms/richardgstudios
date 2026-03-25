import { NextRequest, NextResponse } from "next/server";
import { createKbBoard, getKbBoards, createKbColumn } from "@/lib/db";

const BOARD_TEMPLATES: Record<string, string[]> = {
  blank: [],
  basic: ["A Fazer", "Em Progresso", "Concluído"],
  dev: ["Backlog", "A Fazer", "Em Progresso", "Revisão", "Concluído"],
  content: ["Ideias", "Rascunho", "Revisão", "Publicado"],
};

export async function GET() {
  try {
    const boards = await getKbBoards();
    const mapped = boards.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      color: b.color,
      isFavorite: b.is_favorite === 1,
      isDeleted: b.is_deleted === 1,
      sortOrder: b.sort_order,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      deletedAt: b.deleted_at,
      columnCount: b.column_count,
      cardCount: b.card_count,
    }));
    return NextResponse.json({ boards: mapped });
  } catch (err) {
    console.error("Error fetching boards:", err);
    return NextResponse.json({ error: "Erro ao buscar quadros" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, color, template } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }
    const boardId = await createKbBoard(name, description, color);

    const templateColumns = BOARD_TEMPLATES[template || "blank"] || [];
    for (const colName of templateColumns) {
      await createKbColumn(boardId, colName);
    }

    return NextResponse.json({ id: boardId });
  } catch (err) {
    console.error("Error creating board:", err);
    return NextResponse.json({ error: "Erro ao criar quadro" }, { status: 500 });
  }
}
