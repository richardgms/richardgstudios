import { NextResponse } from "next/server";
import { getDb, toRow } from "@/lib/db";
import { listAllStorageObjects, aggregateByCategory, USE_R2 } from "@/lib/r2-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [objects, dbStats] = await Promise.all([
      listAllStorageObjects(),
      collectDbStats(),
    ]);

    const categories = aggregateByCategory(objects);
    const total = objects.reduce(
      (acc, o) => {
        acc.size += o.size;
        acc.count += 1;
        return acc;
      },
      { size: 0, count: 0 }
    );

    return NextResponse.json({
      backend: USE_R2 ? "r2" : "local",
      total,
      categories,
      database: dbStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[storage/summary] erro:", err);
    return NextResponse.json(
      { error: "Falha ao calcular uso de armazenamento" },
      { status: 500 }
    );
  }
}

type DbStats = {
  brainstormSessions: number;
  brainstormMessages: number;
  studioSessions: number;
  generations: number;
  brandKits: number;
  brandAssets: number;
  promptSavePrompts: number;
  kanboardCards: number;
};

async function collectDbStats(): Promise<DbStats> {
  const db = await getDb();

  const queries: Array<[keyof DbStats, string]> = [
    ["brainstormSessions", "SELECT COUNT(*) as c FROM chat_sessions WHERE deleted_at IS NULL"],
    ["brainstormMessages", "SELECT COUNT(*) as c FROM chat_messages"],
    ["studioSessions", "SELECT COUNT(*) as c FROM sessions WHERE deleted_at IS NULL"],
    ["generations", "SELECT COUNT(*) as c FROM generations WHERE deleted_at IS NULL"],
    ["brandKits", "SELECT COUNT(*) as c FROM brand_kits WHERE is_deleted = 0"],
    ["brandAssets", "SELECT COUNT(*) as c FROM brand_kit_assets"],
    ["promptSavePrompts", "SELECT COUNT(*) as c FROM ps_prompts WHERE is_deleted = 0"],
    ["kanboardCards", "SELECT COUNT(*) as c FROM kb_cards"],
  ];

  const stats: DbStats = {
    brainstormSessions: 0,
    brainstormMessages: 0,
    studioSessions: 0,
    generations: 0,
    brandKits: 0,
    brandAssets: 0,
    promptSavePrompts: 0,
    kanboardCards: 0,
  };

  await Promise.all(
    queries.map(async ([key, sql]) => {
      try {
        const r = await db.execute(sql);
        const row = toRow<{ c?: number }>(r.rows[0]);
        stats[key] = row?.c ?? 0;
      } catch {
        /* tabela pode não existir em DBs antigos */
      }
    })
  );

  return stats;
}
