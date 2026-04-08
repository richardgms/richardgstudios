import { NextRequest } from "next/server";

function isBlockedHost(hostname: string): boolean {
    const blocked = [
        "localhost", "127.0.0.1", "::1", "0.0.0.0",
        "169.254.", "10.", "192.168.", "172.16.", "172.17.", "172.18.",
        "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
        "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
    ];
    return blocked.some((b) => hostname === b || hostname.startsWith(b));
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const videoUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "video.mp4";
    const isDownload = searchParams.get("download") === "1";

    if (!videoUrl) {
        return Response.json({ error: "URL obrigatória" }, { status: 400 });
    }

    let parsed: URL;
    try {
        parsed = new URL(videoUrl);
    } catch {
        return Response.json({ error: "URL inválida" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        return Response.json({ error: "Protocolo não permitido" }, { status: 400 });
    }

    if (isBlockedHost(parsed.hostname)) {
        return Response.json({ error: "Host não permitido" }, { status: 400 });
    }

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    try {
        const upstreamHeaders: Record<string, string> = {
            "User-Agent": "Mozilla/5.0 (compatible; NanoBananaProxy/1.0)",
            Accept: "video/*",
        };
        const rangeHeader = req.headers.get("range");
        if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

        const res = await fetch(videoUrl, {
            headers: upstreamHeaders,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            return Response.json({ error: `Vídeo indisponível (${res.status})` }, { status: 502 });
        }

        const responseContentType = "video/mp4";

        const contentLength = res.headers.get("content-length");

        const headers: Record<string, string> = {
            "Content-Type": responseContentType,
            "Cache-Control": "no-store",
            "Accept-Ranges": "bytes",
        };
        if (isDownload) headers["Content-Disposition"] = `attachment; filename="${safeFilename}"`;
        if (contentLength) headers["Content-Length"] = contentLength;
        const contentRange = res.headers.get("content-range");
        if (contentRange) headers["Content-Range"] = contentRange;

        // Stream directly — avoid buffering large videos in memory
        return new Response(res.body, { status: res.status, headers });

    } catch (err) {
        console.error("[proxy-video] Erro:", err);
        return Response.json({ error: "Falha ao buscar vídeo" }, { status: 500 });
    }
}
