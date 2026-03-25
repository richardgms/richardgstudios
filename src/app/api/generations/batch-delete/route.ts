import { NextResponse } from "next/server";
import { softDelete } from "@/lib/db";
import { deleteAttachments } from "@/lib/attachments";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Invalid array of IDs provided" }, { status: 400 });
        }

        const results = await Promise.allSettled(
            ids.map(async (id) => {
                await softDelete("generations", id);
                try {
                    await deleteAttachments(id);
                } catch (e) {
                    console.error(`Failed to delete physical attachments for ${id}:`, e);
                }
                return id;
            })
        );

        const successful = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            deletedCount: successful,
            failedCount: failed,
        });
    } catch (err) {
        console.error("Failed to batch delete generations:", err);
        return NextResponse.json({ error: "Failed to batch delete generations" }, { status: 500 });
    }
}
