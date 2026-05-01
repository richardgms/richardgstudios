import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, getChatSession } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getChatSession(id);
        if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);
        const before = searchParams.get("before") ?? undefined;

        const { messages, hasMore } = await getChatMessages(id, { limit, before });
        return NextResponse.json({ session, messages, hasMore });
    } catch (err) {
        console.error("Failed to fetch session:", err);
        return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { softDelete } = await import("@/lib/db");
        await softDelete("chat_sessions", id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
    }
}
