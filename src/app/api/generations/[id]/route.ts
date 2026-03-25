import { NextResponse } from "next/server";
import { softDelete } from "@/lib/db";
import { deleteAttachments } from "@/lib/attachments";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await softDelete("generations", id);
        // Clean up physical attachment files
        try {
            await deleteAttachments(id);
        } catch (e) {
            console.error(`Failed to delete physical attachments for ${id}:`, e);
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete generation:", err);
        return NextResponse.json({ error: "Failed to delete generation" }, { status: 500 });
    }
}
