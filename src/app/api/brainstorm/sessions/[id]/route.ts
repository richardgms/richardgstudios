import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, deleteChatSession, getChatSession } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await getChatSession(id);
        if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        const messages = await getChatMessages(id);
        return NextResponse.json({ session, messages });
    } catch (err) {
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
    } catch (err) {
        return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
    }
}
