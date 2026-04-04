import path from "path";
import { promises as fs } from "fs";
import { STORAGE_ROOT } from "./paths";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!; // https://pub-xxx.r2.dev

const USE_R2 = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);

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

/**
 * Saves a buffer to Cloudflare R2 (production) or local filesystem (dev).
 * Returns the public URL to store in the DB.
 */
export async function saveImage(pathname: string, buffer: Buffer, contentType = "image/webp"): Promise<string> {
  if (USE_R2) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2Client();
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: pathname,
      Body: buffer,
      ContentType: contentType,
    }));
    return `${R2_PUBLIC_URL}/${pathname}`;
  }

  const fullPath = path.join(STORAGE_ROOT, pathname);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return `/api/images/${pathname}`;
}

/**
 * Deletes an object from Cloudflare R2 (production) or local filesystem (dev).
 */
export async function deleteImage(url: string): Promise<void> {
  if (USE_R2 && url.startsWith("http")) {
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await getR2Client();
      // Extract the key from the public URL
      const key = url.replace(`${R2_PUBLIC_URL}/`, "");
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } catch {
      // Ignore deletion errors — object may already be gone
    }
    return;
  }

  // Local filesystem path like /api/images/folder/file.webp
  const relative = url.replace("/api/images/", "");
  const fullPath = path.join(STORAGE_ROOT, relative);
  try { await fs.unlink(fullPath); } catch { /* ignore */ }
}
