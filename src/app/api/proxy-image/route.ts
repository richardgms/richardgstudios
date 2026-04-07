import { NextRequest } from "next/server";

// Basic SSRF protection: block private/internal ranges
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
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
        return Response.json({ error: "URL obrigatória" }, { status: 400 });
    }

    let parsed: URL;
    try {
        parsed = new URL(imageUrl);
    } catch {
        return Response.json({ error: "URL inválida" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        return Response.json({ error: "Protocolo não permitido" }, { status: 400 });
    }

    if (isBlockedHost(parsed.hostname)) {
        return Response.json({ error: "Host não permitido" }, { status: 400 });
    }

    try {
        const res = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; NanoBananaProxy/1.0)",
                Accept: "image/*",
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            return Response.json({ error: `Imagem indisponível (${res.status})` }, { status: 502 });
        }

        const contentType = res.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
            return Response.json({ error: "URL não aponta para uma imagem" }, { status: 400 });
        }

        // Limit to 10MB to prevent memory issues
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 10 * 1024 * 1024) {
            return Response.json({ error: "Imagem muito grande (limite: 10MB)" }, { status: 413 });
        }

        return new Response(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (err) {
        console.error("[proxy-image] Erro:", err);
        return Response.json({ error: "Falha ao buscar imagem" }, { status: 500 });
    }
}
