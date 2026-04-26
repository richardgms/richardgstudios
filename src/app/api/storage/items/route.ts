import { NextRequest, NextResponse } from "next/server";
import { getDb, toRows } from "@/lib/db";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  CategoryId,
  deleteR2Keys,
  listAllStorageObjects,
  urlVariantsForKey,
} from "@/lib/r2-admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

// ─── GET: listagem paginada por categoria ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = sp.get("category") as CategoryId | null;
    const sort = (sp.get("sort") || "size") as "size" | "date";
    const order = (sp.get("order") || "desc") as "asc" | "desc";
    const cursor = parseInt(sp.get("cursor") || "0", 10) || 0;
    const search = (sp.get("q") || "").toLowerCase();

    if (!category || !ALL_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }

    const all = await listAllStorageObjects();
    let filtered = all.filter((o) => o.category === category);
    if (search) filtered = filtered.filter((o) => o.key.toLowerCase().includes(search));

    filtered.sort((a, b) => {
      const dir = order === "asc" ? 1 : -1;
      if (sort === "date") {
        return (a.lastModified < b.lastModified ? -1 : 1) * dir;
      }
      return (a.size - b.size) * dir;
    });

    const slice = filtered.slice(cursor, cursor + PAGE_SIZE);
    const nextCursor = cursor + PAGE_SIZE < filtered.length ? cursor + PAGE_SIZE : null;
    const totalSize = filtered.reduce((acc, o) => acc + o.size, 0);

    return NextResponse.json({
      category,
      label: CATEGORY_LABELS[category].label,
      items: slice,
      nextCursor,
      totalCount: filtered.length,
      totalSize,
    });
  } catch (err) {
    console.error("[storage/items] GET erro:", err);
    return NextResponse.json({ error: "Falha ao listar itens" }, { status: 500 });
  }
}

// ─── DELETE: deleta keys específicas com cascata em DB ────────────────────────

type DeleteBody = { keys: string[] };

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as DeleteBody;
    const keys = (body?.keys || []).filter((k) => typeof k === "string" && k.length > 0);
    if (keys.length === 0) {
      return NextResponse.json({ error: "Nenhuma chave informada" }, { status: 400 });
    }

    const deleted = await deleteR2Keys(keys);
    const dbRemoved = await cascadeDbCleanup(keys);

    return NextResponse.json({ deleted, dbRemoved });
  } catch (err) {
    console.error("[storage/items] DELETE erro:", err);
    return NextResponse.json({ error: "Falha ao deletar itens" }, { status: 500 });
  }
}

// ─── Cascata em DB ─────────────────────────────────────────────────────────────

type CascadeResult = {
  generations: number;
  brandAssets: number;
  chatAttachments: number;
};

async function cascadeDbCleanup(keys: string[]): Promise<CascadeResult> {
  const db = await getDb();
  const result: CascadeResult = { generations: 0, brandAssets: 0, chatAttachments: 0 };

  // Construir todas as variantes de URL/key para procurar no DB
  const allVariants = keys.flatMap((k) => urlVariantsForKey(k));
  if (allVariants.length === 0) return result;

  // 1) Generations: image_path / thumbnail_url
  try {
    const placeholders = allVariants.map(() => "?").join(", ");
    const r = await db.execute({
      sql: `DELETE FROM generations WHERE image_path IN (${placeholders}) OR thumbnail_url IN (${placeholders})`,
      args: [...allVariants, ...allVariants],
    });
    result.generations = r.rowsAffected || 0;
  } catch {
    /* ignore */
  }

  // 2) Brand assets: r2_key (apenas a key crua, sem prefixo URL)
  try {
    const placeholders = keys.map(() => "?").join(", ");
    const r = await db.execute({
      sql: `DELETE FROM brand_kit_assets WHERE r2_key IN (${placeholders})`,
      args: keys,
    });
    result.brandAssets = r.rowsAffected || 0;
  } catch {
    /* ignore */
  }

  // 3) Chat messages attachments: JSON contém URLs — varremos e atualizamos
  try {
    const variantSet = new Set(allVariants);
    const rows = await db.execute("SELECT id, attachments FROM chat_messages WHERE attachments IS NOT NULL");
    const messages = toRows<{ id: string; attachments: string }>(rows.rows);
    for (const m of messages) {
      try {
        const arr = JSON.parse(m.attachments) as Array<{ url?: string }>;
        if (!Array.isArray(arr)) continue;
        const cleaned = arr.filter((a) => !a?.url || !variantSet.has(a.url));
        if (cleaned.length !== arr.length) {
          const next = cleaned.length > 0 ? JSON.stringify(cleaned) : null;
          await db.execute({
            sql: "UPDATE chat_messages SET attachments = ? WHERE id = ?",
            args: [next, m.id],
          });
          result.chatAttachments += arr.length - cleaned.length;
        }
      } catch {
        /* JSON parse failure — skip */
      }
    }
  } catch {
    /* ignore */
  }

  return result;
}
