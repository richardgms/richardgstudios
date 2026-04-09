import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { STORAGE_ROOT } from "@/lib/paths";

const STORAGE_DIR = path.resolve(STORAGE_ROOT);
const CACHE_DIR = path.resolve(path.join(STORAGE_ROOT, ".cache"));

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

    let sourceBuffer: Buffer;
    let cacheKeyBase: string;

    // REMOTE PROXY MODE
    if (segments[0] === "remote") {
        const url = searchParams.get("url");
        if (!url) {
            return NextResponse.json({ error: "URL remota ausente" }, { status: 400 });
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            sourceBuffer = Buffer.from(arrayBuffer);
            // Stable hash for cache filename to avoid path length issues
            const hash = crypto.createHash("md5").update(url).digest("hex");
            cacheKeyBase = `remote_${hash}`;
        } catch (err) {
            console.error("[api/images] Fetch error:", err);
            return NextResponse.json({ error: "Erro ao buscar imagem remota" }, { status: 502 });
        }
    } else {
        // LOCAL FILE MODE
        const filePath = path.join(STORAGE_DIR, ...segments);
        const safePath = path.normalize(filePath);
        const resolved = path.resolve(safePath);

        if (!resolved.startsWith(STORAGE_DIR)) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        if (!fs.existsSync(resolved)) {
            return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
        }

        sourceBuffer = fs.readFileSync(resolved);
        cacheKeyBase = segments.join("_").replace(/[^a-z0-9_.-]/gi, "_");
    }

    // If no resize requested, serve the original (as WebP for remote if possible, or raw for local)
    if (!width && segments[0] !== "remote") {
        const ext = segments[segments.length - 1].split(".").pop()?.toLowerCase();
        const contentType = ext === "webp" ? "image/webp"
            : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
                : "image/png";

        return new NextResponse(new Uint8Array(sourceBuffer), {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    }

    // Build a stable cache key
    const cacheKey = `${cacheKeyBase}_w${width || "orig"}_q${quality}.webp`;
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

    // Process with sharp
    try {
        let pipeline = sharp(sourceBuffer);
        
        if (width) {
            pipeline = pipeline.resize(width, null, {
                fit: "inside",
                withoutEnlargement: true,
            });
        }

        const processedBuffer = await pipeline
            .webp({ quality })
            .toBuffer();

        // Write to cache (ephemeral but useful within same function instance or local dev)
        try {
            fs.writeFileSync(cachePath, processedBuffer);
        } catch { }

        return new NextResponse(new Uint8Array(processedBuffer), {
            headers: {
                "Content-Type": "image/webp",
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Cache": "MISS",
            },
        });
    } catch (err) {
        console.error("[api/images] Sharp error:", err);
        return new NextResponse(new Uint8Array(sourceBuffer), {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=86400",
            },
        });
    }
}
