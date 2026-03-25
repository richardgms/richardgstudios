import { NextRequest, NextResponse } from "next/server";
import { searchChatSessions } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
    const correlationId = uuidv4();
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q");
        const agent = searchParams.get("agent") || "thomas";

        console.log(`[SEARCH][${correlationId}] query="${q}" agent=${agent}`);

        if (!q || q.length < 2) {
            return NextResponse.json({ sessions: [], cid: correlationId });
        }

        // Basic Rate Limit (security-auditor)
        if (q.length > 200) {
            return NextResponse.json({ error: "Search query too long", cid: correlationId }, { status: 400 });
        }

        const sessions = await searchChatSessions(q, agent);
        return NextResponse.json({ sessions, cid: correlationId });
    } catch (error) {
        console.error(`[SEARCH][${correlationId}] ERROR:`, error);
        return NextResponse.json({ error: "Inner search failure", cid: correlationId }, { status: 500 });
    }
}
