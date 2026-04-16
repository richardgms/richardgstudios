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
 * Fetches a brand asset from R2 (or local storage in dev) by its r2_key.
 * Returns the raw buffer for server-side base64 encoding.
 */
export async function getBrandAssetBuffer(r2Key: string): Promise<Buffer> {
  if (USE_R2) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2Client();
    const response = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  const fullPath = path.join(STORAGE_ROOT, r2Key);
  return fs.readFile(fullPath);
}

/**
 * Compresses an image buffer to WebP, respecting a max byte size.
 * Tries decreasing quality steps until the target is reached.
 */
export async function compressToWebP(buffer: Buffer, maxBytes = 800 * 1024): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  let quality = 85;
  let result = await sharp(buffer)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  while (result.byteLength > maxBytes && quality > 30) {
    quality -= 10;
    result = await sharp(buffer)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }
  return result;
}

/**
 * Uploads a brand asset to R2 (or local storage in dev).
 * Returns the r2_key (object path), NOT the public URL.
 */
export async function saveBrandAsset(r2Key: string, buffer: Buffer): Promise<void> {
  if (USE_R2) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2Client();
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: "image/webp",
    }));
    return;
  }

  const fullPath = path.join(STORAGE_ROOT, r2Key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

/**
 * Deletes a brand asset from R2 (or local storage in dev) by its r2_key.
 */
export async function deleteBrandAsset(r2Key: string): Promise<void> {
  if (USE_R2) {
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await getR2Client();
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }));
    } catch { /* ignore */ }
    return;
  }

  const fullPath = path.join(STORAGE_ROOT, r2Key);
  try { await fs.unlink(fullPath); } catch { /* ignore */ }
}

/**
 * Returns a proxy URL for displaying a brand asset in the browser (CORS bypass).
 * In dev, returns a local /api/images/... path.
 */
export function brandAssetProxyUrl(r2Key: string): string {
  if (R2_PUBLIC_URL) {
    return `/api/proxy-image?url=${encodeURIComponent(`${R2_PUBLIC_URL}/${r2Key}`)}`;
  }
  return `/api/images/${r2Key}`;
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
