import { NextRequest, NextResponse } from "next/server";
import { hardDelete, getDb, getTrashItems } from "@/lib/db";

export async function GET() {
    try {
        const trash = await getTrashItems();
        return NextResponse.json(trash);
    } catch (err) {
        console.error("Failed to fetch trash items:", err);
        return NextResponse.json({ error: "Failed to fetch trash items" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { type, ids, all } = await req.json();

        if (all) {
            // Empty Trash (Manual Trigger)
            const db = await getDb();
            // Get all soft-deleted items to properly delete files
            const deletedGensResult = await db.execute("SELECT id FROM generations WHERE deleted_at IS NOT NULL");
            for (const g of deletedGensResult.rows as any[]) await hardDelete("generations", g.id);

            const deletedChatsResult = await db.execute("SELECT id FROM chat_sessions WHERE deleted_at IS NOT NULL");
            for (const c of deletedChatsResult.rows as any[]) await hardDelete("chat_sessions", c.id);

            const deletedSessionsResult = await db.execute("SELECT id FROM sessions WHERE deleted_at IS NOT NULL");
            for (const s of deletedSessionsResult.rows as any[]) await hardDelete("sessions", s.id);

            return NextResponse.json({ success: true, mode: "all" });
        }

        if (!type || !ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Map frontend types to DB table names
        let table: "chat_sessions" | "generations" | "sessions" | null = null;
        if (type === "chat") table = "chat_sessions";
        if (type === "image") table = "generations";
        if (type === "session") table = "sessions";

        if (!table) {
            // Special handling for mixed types if needed, but UI usually separates them or sends distinct calls.
            // Adjusting logic: if type is array or mixed, this simple logic might fail.
            // Assuming simplified "one type at a time" bulk action for now.
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        for (const id of ids) {
            await hardDelete(table, id);
        }

        return NextResponse.json({ success: true, count: ids.length });
    } catch (err) {
        console.error("Failed to delete items:", err);
        return NextResponse.json({ error: "Failed to delete items" }, { status: 500 });
    }
}
