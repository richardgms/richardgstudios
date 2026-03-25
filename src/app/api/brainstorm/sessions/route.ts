import { NextRequest, NextResponse } from "next/server";
import { getChatSessions, createChatSession } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const agent = req.nextUrl.searchParams.get("agent") || "thomas";
        const sessions = await getChatSessions(agent);
        return NextResponse.json({ sessions });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const id = await createChatSession(name);
        return NextResponse.json({ id, name });
    } catch (err) {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
}
