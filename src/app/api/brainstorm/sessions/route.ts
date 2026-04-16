import { NextRequest, NextResponse } from "next/server";
import { getChatSessions, createChatSession, addChatMessage, getBrandKit, getBrandKitAssets } from "@/lib/db";
import { composeBrandText, composeBrandAck } from "@/lib/brand-context";

export async function GET(req: NextRequest) {
    try {
        const agent = req.nextUrl.searchParams.get("agent") || "thomas";
        const sessions = await getChatSessions(agent);
        return NextResponse.json({ sessions });
    } catch {
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, agent = "thomas", brand_id } = await req.json();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        if (brand_id) {
            const brand = await getBrandKit(brand_id);
            if (!brand) {
                return NextResponse.json({ error: "Marca não encontrada" }, { status: 404 });
            }

            const assets = await getBrandKitAssets(brand_id);
            const id = await createChatSession(name, agent, brand_id);

            // Save brand context message (role "brand" — filtered in UI, rebuilt for Gemini per request)
            // Store r2_keys so the chat route can re-fetch assets fresh on each call
            await addChatMessage(
                id,
                "brand",
                composeBrandText(brand),
                assets.length
                    ? assets.map((a) => ({ url: a.r2_key, type: "image/webp", name: a.title }))
                    : undefined
            );

            // Save model acknowledgment (visible as first AI message)
            await addChatMessage(id, "model", composeBrandAck(brand.name));

            return NextResponse.json({ id, name, brand_id, agent });
        }

        const id = await createChatSession(name, agent);
        return NextResponse.json({ id, name, agent });
    } catch {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
}
