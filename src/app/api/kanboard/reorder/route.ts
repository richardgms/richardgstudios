import { NextRequest, NextResponse } from "next/server";
import { reorderKbColumns, reorderKbCards, reorderKbChecklist } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { type, columnId, orderedIds } = await req.json();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds obrigatório" }, { status: 400 });
    }

    switch (type) {
      case "columns":
        reorderKbColumns(orderedIds);
        break;
      case "cards":
        if (!columnId) return NextResponse.json({ error: "columnId obrigatório para cards" }, { status: 400 });
        reorderKbCards(columnId, orderedIds);
        break;
      case "checklist":
        reorderKbChecklist(orderedIds);
        break;
      default:
        return NextResponse.json({ error: "type inválido" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error reordering:", err);
    return NextResponse.json({ error: "Erro ao reordenar" }, { status: 500 });
  }
}
