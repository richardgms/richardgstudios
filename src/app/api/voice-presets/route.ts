import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { STORAGE_ROOT } from "@/lib/paths";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, name, description, audio_path, created_at FROM voice_presets ORDER BY created_at DESC"
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const audioFile = formData.get("audio") as File | null;

  if (!name) {
    return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  }
  if (!audioFile || audioFile.size === 0) {
    return NextResponse.json({ error: "Arquivo de áudio obrigatório." }, { status: 400 });
  }
  if (audioFile.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo: 20MB." }, { status: 400 });
  }

  const id = uuidv4();
  const ext = audioFile.name.split(".").pop()?.toLowerCase() || "wav";
  const filename = `${id}.${ext}`;
  const voicesDir = path.join(STORAGE_ROOT, "voices");
  fs.mkdirSync(voicesDir, { recursive: true });

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  fs.writeFileSync(path.join(voicesDir, filename), buffer);

  const relPath = `voices/${filename}`;

  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO voice_presets (id, name, description, audio_path) VALUES (?, ?, ?, ?)",
    args: [id, name, description, relPath],
  });

  return NextResponse.json({
    id,
    name,
    description,
    audio_path: relPath,
    created_at: new Date().toISOString(),
  });
}
