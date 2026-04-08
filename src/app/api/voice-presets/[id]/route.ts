import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { STORAGE_ROOT } from "@/lib/paths";
import fs from "fs";
import path from "path";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = await getDb();

  const result = await db.execute({
    sql: "SELECT audio_path FROM voice_presets WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Preset não encontrado." }, { status: 404 });
  }

  const row = result.rows[0] as unknown as { audio_path: string };
  const filePath = path.join(STORAGE_ROOT, row.audio_path);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* ignore */ }

  await db.execute({
    sql: "DELETE FROM voice_presets WHERE id = ?",
    args: [id],
  });

  return NextResponse.json({ success: true });
}
