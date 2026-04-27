import { NextRequest, NextResponse } from "next/server";
import { getDb, toRows } from "@/lib/db";
import { deleteR2Keys, listAllStorageObjects } from "@/lib/r2-admin";

export const dynamic = "force-dynamic";

export type DbWipeTarget = "brainstorm" | "studio-sessions";

type Body = { target: DbWipeTarget };

/**
 * Limpeza de dados no banco que não são cobertos pelas categorias R2.
 *
 * - brainstorm: zera chat_sessions + chat_messages e remove os thumbs em _chat/* do R2.
 * - studio-sessions: zera sessions e cascata em generations vinculadas (mantendo
 *   o comportamento do hardDelete existente). Também remove os arquivos R2 dessas
 *   generations.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const target = body?.target;

    if (target !== "brainstorm" && target !== "studio-sessions") {
      return NextResponse.json({ error: "Target inválido" }, { status: 400 });
    }

    const db = await getDb();
    const result = {
      target,
      r2Deleted: 0,
      sessions: 0,
      messages: 0,
      generations: 0,
    };

    if (target === "brainstorm") {
      // 1) coleta thumbs do R2 a deletar (_chat/*)
      const all = await listAllStorageObjects();
      const chatKeys = all.filter((o) => o.category === "chat-thumbs").map((o) => o.key);
      result.r2Deleted = await deleteR2Keys(chatKeys);

      // 2) zera tabelas
      try {
        const r1 = await db.execute("DELETE FROM chat_messages");
        result.messages = r1.rowsAffected || 0;
      } catch { /* ignore */ }
      try {
        const r2 = await db.execute("DELETE FROM chat_sessions");
        result.sessions = r2.rowsAffected || 0;
      } catch { /* ignore */ }
    }

    if (target === "studio-sessions") {
      // 1) coleta generations vinculadas a sessões pra deletar do R2 também
      let imagePathsResult;
      try {
        imagePathsResult = await db.execute(
          "SELECT image_path, thumbnail_url FROM generations WHERE session_id IS NOT NULL"
        );
      } catch {
        imagePathsResult = { rows: [] as unknown[] };
      }
      const rows = toRows<{ image_path?: string; thumbnail_url?: string }>(imagePathsResult.rows);
      const all = await listAllStorageObjects();
      const allKeysSet = new Set(all.map((o) => o.key));

      const keysToDelete: string[] = [];
      for (const row of rows) {
        for (const url of [row.image_path, row.thumbnail_url]) {
          if (!url) continue;
          // tenta como URL pública R2 ou path local
          const stripped = url.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/api\/images\//, "");
          if (allKeysSet.has(stripped)) keysToDelete.push(stripped);
        }
      }
      result.r2Deleted = await deleteR2Keys(keysToDelete);

      // 2) cascata DB: deleta generations vinculadas e depois as sessões
      try {
        const rg = await db.execute("DELETE FROM generations WHERE session_id IS NOT NULL");
        result.generations = rg.rowsAffected || 0;
      } catch { /* ignore */ }
      try {
        const rs = await db.execute("DELETE FROM sessions");
        result.sessions = rs.rowsAffected || 0;
      } catch { /* ignore */ }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[storage/database] erro:", err);
    return NextResponse.json({ error: "Falha ao limpar dados do banco" }, { status: 500 });
  }
}
