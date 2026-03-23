
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
    try {
        const db = getDb();

        // Get count of generations created today (in local time or UTC as stored)
        // Assuming created_at is stored as ISO string or timestamp
        // SQLite 'date("now")' returns UTC date. Adjust logic if timezone matters significantly.

        // Count generated images from today
        const stmt = db.prepare(`
            SELECT COUNT(*) as count 
            FROM generations 
            WHERE date(created_at) = date('now')
        `);

        const result = stmt.get() as { count: number };

        return NextResponse.json({
            today: result.count || 0
        });
    } catch (error) {
        console.error("Stats error:", error);
        // Fail gracefully returning 0 instead of 500 to keep UI clean
        return NextResponse.json({ today: 0 });
    }
}
