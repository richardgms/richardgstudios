import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  ALL_CATEGORIES,
  CategoryId,
  deleteR2Keys,
  listAllStorageObjects,
} from "@/lib/r2-admin";

export const dynamic = "force-dynamic";

type Body = { category: CategoryId | "all"; confirmAll?: boolean };

/**
 * Esvazia uma categoria inteira (ou todas as categorias com confirmAll=true).
 * Cascata em DB para manter referências consistentes.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const category = body?.category;

    if (!category) {
      return NextResponse.json({ error: "Categoria não informada" }, { status: 400 });
    }
    if (category !== "all" && !ALL_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }
    if (category === "all" && !body.confirmAll) {
      return NextResponse.json(
        { error: "Confirmação dupla obrigatória para esvaziar tudo" },
        { status: 400 }
      );
    }

    const all = await listAllStorageObjects();
    const targetObjects = category === "all" ? all : all.filter((o) => o.category === category);
    const targetKeys = targetObjects.map((o) => o.key);

    const deleted = await deleteR2Keys(targetKeys);
    const dbRemoved = await cascadeCategoryCleanup(category);

    return NextResponse.json({
      category,
      deleted,
      requested: targetKeys.length,
      dbRemoved,
    });
  } catch (err) {
    console.error("[storage/category] erro:", err);
    return NextResponse.json({ error: "Falha ao esvaziar categoria" }, { status: 500 });
  }
}

type CascadeResult = {
  generations: number;
  brandAssets: number;
  chatMessages: number;
  chatSessions: number;
};

/**
 * Limpa as tabelas relacionadas a uma categoria, garantindo consistência.
 * Diferente da deleção por keys (que faz lookup), aqui esvaziamos tudo.
 */
async function cascadeCategoryCleanup(category: CategoryId | "all"): Promise<CascadeResult> {
  const db = await getDb();
  const result: CascadeResult = { generations: 0, brandAssets: 0, chatMessages: 0, chatSessions: 0 };

  const wipeGenerations = async (filter: string) => {
    try {
      const r = await db.execute(`DELETE FROM generations WHERE ${filter}`);
      result.generations += r.rowsAffected || 0;
    } catch {
      /* ignore */
    }
  };

  const wipeBrandAssets = async () => {
    try {
      const r = await db.execute("DELETE FROM brand_kit_assets");
      result.brandAssets += r.rowsAffected || 0;
    } catch {
      /* ignore */
    }
  };

  const wipeChat = async () => {
    try {
      const r1 = await db.execute("DELETE FROM chat_messages");
      result.chatMessages += r1.rowsAffected || 0;
      const r2 = await db.execute("DELETE FROM chat_sessions");
      result.chatSessions += r2.rowsAffected || 0;
    } catch {
      /* ignore */
    }
  };

  const clearChatAttachments = async () => {
    try {
      const r = await db.execute("UPDATE chat_messages SET attachments = NULL WHERE attachments IS NOT NULL");
      result.chatMessages += r.rowsAffected || 0;
    } catch {
      /* ignore */
    }
  };

  if (category === "gen-images") {
    await wipeGenerations("media_type = 'image'");
  } else if (category === "gen-videos") {
    await wipeGenerations("media_type = 'video'");
  } else if (category === "gen-attachments") {
    // mantém as generations, só limpa o R2 — nada a fazer no DB
  } else if (category === "video-thumbs") {
    try {
      const r = await db.execute("UPDATE generations SET thumbnail_url = NULL WHERE thumbnail_url IS NOT NULL");
      result.generations += r.rowsAffected || 0;
    } catch {
      /* ignore */
    }
  } else if (category === "chat-thumbs") {
    await clearChatAttachments();
  } else if (category === "brand-assets") {
    await wipeBrandAssets();
  } else if (category === "all") {
    await wipeChat();
    await wipeBrandAssets();
    await wipeGenerations("1=1");
  }

  return result;
}
