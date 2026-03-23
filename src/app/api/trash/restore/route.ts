import { NextRequest, NextResponse } from "next/server";
import { restore } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { type, ids } = await req.json();

        if (!type || !ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Map frontend types to DB table names
        let table: "chat_sessions" | "generations" | "sessions" | null = null;
        if (type === "chat") table = "chat_sessions";
        if (type === "image") table = "generations";
        if (type === "session") table = "sessions"; // Studio sessions

        if (!table) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        for (const id of ids) {
            restore(table, id);
        }

        return NextResponse.json({ success: true, count: ids.length });
    } catch (err) {
        console.error("Failed to restore items:", err);
        return NextResponse.json({ error: "Failed to restore items" }, { status: 500 });
    }
}
