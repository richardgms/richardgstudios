import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const STORAGE_DIR = path.resolve(path.join(process.cwd(), "storage"));
const CACHE_DIR = path.resolve(path.join(process.cwd(), "storage", ".cache"));

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path: segments } = await context.params;

    if (!segments || segments.length === 0) {
        return NextResponse.json({ error: "Parâmetro de caminho inválido" }, { status: 400 });
    }

    // Parse optional resize params: ?w=400&q=80
    const { searchParams } = req.nextUrl;
    const widthParam = searchParams.get("w");
    const qualityParam = searchParams.get("q");
    const width = widthParam ? Math.min(parseInt(widthParam, 10), 2048) : null;
    const quality = qualityParam ? Math.min(Math.max(parseInt(qualityParam, 10), 10), 100) : 80;

    // Resolve and validate the source file path
    const filePath = path.join(STORAGE_DIR, ...segments);
    const safePath = path.normalize(filePath);
    const resolved = path.resolve(safePath);

    if (!resolved.startsWith(STORAGE_DIR)) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (!fs.existsSync(resolved)) {
        return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
    }

    // If no resize requested, serve the original file directly
    if (!width) {
        const buffer = fs.readFileSync(resolved);
        const ext = path.extname(resolved).toLowerCase();
        const contentType = ext === ".webp" ? "image/webp"
            : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
                : "image/png";
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    }

    // Build a stable cache key based on path + width + quality
    const cacheKey = `${segments.join("_").replace(/[^a-z0-9_.-]/gi, "_")}_w${width}_q${quality}.webp`;
    const cachePath = path.join(CACHE_DIR, cacheKey);

    // Serve from cache if it exists (O(1) read)
    if (fs.existsSync(cachePath)) {
        const cachedBuffer = fs.readFileSync(cachePath);
        return new NextResponse(new Uint8Array(cachedBuffer), {
            headers: {
                "Content-Type": "image/webp",
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Cache": "HIT",
            },
        });
    }

    // Process with sharp: resize + convert to WebP
    try {
        const resizedBuffer = await sharp(resolved)
            .resize(width, null, {
                fit: "inside",      // preserve aspect ratio
                withoutEnlargement: true,  // never upscale
            })
            .webp({ quality })
            .toBuffer();

        // Write to cache for future requests
        try {
            fs.writeFileSync(cachePath, resizedBuffer);
        } catch {
            // Cache write failure is non-fatal; just serve from memory
        }

        return new NextResponse(new Uint8Array(resizedBuffer), {
            headers: {
                "Content-Type": "image/webp",
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Cache": "MISS",
            },
        });
    } catch (err) {
        console.error("[api/images] Error processing image:", err);
        // Fallback: serve original if sharp fails
        const buffer = fs.readFileSync(resolved);
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400",
            },
        });
    }
}
