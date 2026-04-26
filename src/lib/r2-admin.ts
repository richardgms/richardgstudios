import path from "path";
import { promises as fs } from "fs";
import { STORAGE_ROOT } from "./paths";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export const USE_R2 = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);

async function getR2Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// ─── Categorias ────────────────────────────────────────────────────────────────

export type CategoryId =
  | "gen-images"
  | "gen-videos"
  | "gen-attachments"
  | "chat-thumbs"
  | "video-thumbs"
  | "brand-assets"
  | "other";

export const CATEGORY_LABELS: Record<CategoryId, { label: string; description: string }> = {
  "gen-images": {
    label: "Imagens geradas",
    description: "Resultados de geração de imagens (Flash, Pro, Imagen, etc.)",
  },
  "gen-videos": {
    label: "Vídeos gerados",
    description: "Resultados de geração de vídeo (Veo)",
  },
  "gen-attachments": {
    label: "Anexos de geração",
    description: "Imagens de referência enviadas como input no Studio",
  },
  "chat-thumbs": {
    label: "Anexos do Brainstorm",
    description: "Pré-visualizações dos arquivos enviados nos chats Thomas/Aurora",
  },
  "video-thumbs": {
    label: "Capas de vídeo",
    description: "Thumbnails (poster) gerados a partir do primeiro frame dos vídeos",
  },
  "brand-assets": {
    label: "Assets de Marcas",
    description: "Imagens vinculadas aos Brand Kits",
  },
  other: {
    label: "Não categorizado",
    description: "Objetos no bucket que não se encaixam nas categorias conhecidas",
  },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryId[];

export function categorize(key: string): CategoryId {
  if (key.startsWith("generations/attachments/")) return "gen-attachments";
  if (key.startsWith("generations/") && /\.(mp4|webm|mov)$/i.test(key)) return "gen-videos";
  if (key.startsWith("generations/")) return "gen-images";
  if (key.startsWith("_chat/")) return "chat-thumbs";
  if (key.startsWith("_thumbs/")) return "video-thumbs";
  if (key.startsWith("brands/")) return "brand-assets";
  return "other";
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type StorageObject = {
  key: string;
  size: number;
  lastModified: string;
  category: CategoryId;
  url: string;
};

export type CategoryAggregate = {
  id: CategoryId;
  label: string;
  description: string;
  count: number;
  size: number;
};

// ─── Listagem ──────────────────────────────────────────────────────────────────

async function listAllR2Objects(): Promise<StorageObject[]> {
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();

  const objects: StorageObject[] = [];
  let continuationToken: string | undefined;
  let safety = 0;

  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const o of out.Contents || []) {
      if (!o.Key) continue;
      const cat = categorize(o.Key);
      objects.push({
        key: o.Key,
        size: o.Size ?? 0,
        lastModified: (o.LastModified ?? new Date()).toISOString(),
        category: cat,
        url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${o.Key}` : `/api/images/${o.Key}`,
      });
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    safety++;
    if (safety > 500) break; // sanity: 500k objects max
  } while (continuationToken);

  return objects;
}

async function listAllLocalObjects(): Promise<StorageObject[]> {
  const objects: StorageObject[] = [];

  async function walk(dir: string, rel = "") {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, r);
      } else if (entry.isFile()) {
        try {
          const st = await fs.stat(abs);
          objects.push({
            key: r,
            size: st.size,
            lastModified: st.mtime.toISOString(),
            category: categorize(r),
            url: `/api/images/${r}`,
          });
        } catch {
          /* ignore */
        }
      }
    }
  }

  await walk(STORAGE_ROOT);
  return objects;
}

export async function listAllStorageObjects(): Promise<StorageObject[]> {
  if (USE_R2) return listAllR2Objects();
  return listAllLocalObjects();
}

export function aggregateByCategory(objects: StorageObject[]): CategoryAggregate[] {
  const map = new Map<CategoryId, CategoryAggregate>();
  for (const cat of ALL_CATEGORIES) {
    const meta = CATEGORY_LABELS[cat];
    map.set(cat, { id: cat, label: meta.label, description: meta.description, count: 0, size: 0 });
  }
  for (const obj of objects) {
    const agg = map.get(obj.category)!;
    agg.count += 1;
    agg.size += obj.size;
  }
  return Array.from(map.values()).sort((a, b) => b.size - a.size);
}

// ─── Deleção ───────────────────────────────────────────────────────────────────

export async function deleteR2Keys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  if (USE_R2) {
    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2Client();
    let deleted = 0;
    // S3 batch delete max 1000 per request
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      const out = await client.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        })
      );
      deleted += batch.length - (out.Errors?.length ?? 0);
    }
    return deleted;
  }

  let deleted = 0;
  for (const key of keys) {
    const full = path.join(STORAGE_ROOT, key);
    try {
      await fs.unlink(full);
      deleted++;
    } catch {
      /* ignore */
    }
  }
  return deleted;
}

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * Converte uma chave R2 em todas as variantes de URL possíveis salvas no DB,
 * para que o cleanup encontre as referências corretas.
 */
export function urlVariantsForKey(key: string): string[] {
  const variants = new Set<string>();
  if (R2_PUBLIC_URL) variants.add(`${R2_PUBLIC_URL}/${key}`);
  variants.add(`/api/images/${key}`);
  variants.add(key);
  return Array.from(variants);
}
