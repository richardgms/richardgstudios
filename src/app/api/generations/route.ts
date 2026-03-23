import { NextResponse } from "next/server";
import { getGenerations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const offset = parseInt(searchParams.get("offset") || "0", 10);
        const limit = parseInt(searchParams.get("limit") || "50", 10);

        // Security & Performance: Validate pagination parameters
        if (isNaN(offset) || offset < 0) {
            return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
        }
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return NextResponse.json({ error: "Invalid limit. Must be between 1 and 100" }, { status: 400 });
        }

        // NOTE: In a real multi-tenant app, we would extract the session here and pass `userId` to the DB.
        // Since this is a local local-desktop style DB, we fetch the generations.
        const generations = getGenerations(limit, offset);

        return NextResponse.json({ generations });
    } catch (error) {
        console.error("Failed to fetch generations:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
