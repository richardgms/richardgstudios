import { NextRequest } from "next/server";

type SearchImageResult = {
    title: string;
    url: string;
    thumbnail: string;
    width: number;
    height: number;
    source: string;
};

type GoogleSearchItem = {
    title?: string;
    link?: string;
    displayLink?: string;
    image?: {
        thumbnailLink?: string;
        width?: number;
        height?: number;
    };
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || !q.trim()) {
        return Response.json({ error: "Query obrigatória" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
        return Response.json({ configured: false, results: [] });
    }

    try {
        const url = new URL("https://www.googleapis.com/customsearch/v1");
        url.searchParams.set("key", apiKey);
        url.searchParams.set("cx", cx);
        url.searchParams.set("searchType", "image");
        url.searchParams.set("q", q.trim());
        url.searchParams.set("num", "10");
        url.searchParams.set("safe", "active");
        url.searchParams.set("gl", "br");
        url.searchParams.set("hl", "pt");

        const res = await fetch(url.toString(), { next: { revalidate: 0 } });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = (err as { error?: { message?: string } }).error?.message || `Erro HTTP ${res.status}`;
            return Response.json({ error: msg }, { status: res.status });
        }

        const data = await res.json() as { items?: GoogleSearchItem[] };

        const results: SearchImageResult[] = (data.items || []).map((item) => ({
            title: item.title || "",
            url: item.link || "",
            thumbnail: item.image?.thumbnailLink || "",
            width: item.image?.width || 0,
            height: item.image?.height || 0,
            source: item.displayLink || "",
        })).filter((r) => r.url && r.thumbnail);

        return Response.json({ configured: true, results });

    } catch (err) {
        console.error("[search-images] Erro:", err);
        return Response.json({ error: "Falha ao buscar imagens" }, { status: 500 });
    }
}
