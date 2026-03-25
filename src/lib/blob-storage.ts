import path from "path";
import { promises as fs } from "fs";
import { STORAGE_ROOT } from "./paths";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Saves an image buffer to Vercel Blob (production) or local filesystem (dev).
 * Returns the public URL to store in the DB.
 */
export async function saveImage(pathname: string, buffer: Buffer): Promise<string> {
  if (USE_BLOB) {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, buffer, { access: "public" });
    return blob.url;
  }
  const fullPath = path.join(STORAGE_ROOT, pathname);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return `/api/images/${pathname}`;
}

/**
 * Deletes an image from Vercel Blob (production) or local filesystem (dev).
 */
export async function deleteImage(url: string): Promise<void> {
  if (url.startsWith("http")) {
    if (USE_BLOB) {
      const { del } = await import("@vercel/blob");
      await del(url).catch(() => {});
    }
    return;
  }
  // Local filesystem path like /api/images/folder/file.png
  const relative = url.replace("/api/images/", "");
  const fullPath = path.join(STORAGE_ROOT, relative);
  try { await fs.unlink(fullPath); } catch { /* ignore */ }
}
