import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import os from "os";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Images are compressed client-side to < 4MB.
        // Videos/PDFs must be under Vercel's 4.5MB serverless body limit.
        const MAX_SIZE_MB = 20;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            return NextResponse.json(
                { error: `File exceeds the maximum ${MAX_SIZE_MB}MB limit` },
                { status: 413 }
            );
        }

        const validTypes = ["video/mp4", "video/webm", "video/quicktime", "application/pdf"];
        if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Invalid file type. Only videos, images, and PDFs are allowed." },
                { status: 415 }
            );
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const tempId = Date.now() + "-" + Math.random().toString(36).substring(2);
        const tempFilePath = join(os.tmpdir(), `${tempId}-${file.name}`);

        await writeFile(tempFilePath, buffer);

        let uploadResult;
        try {
            uploadResult = await ai.files.upload({
                file: tempFilePath,
                config: {
                    mimeType: file.type,
                    displayName: file.name
                }
            });
        } finally {
            unlink(tempFilePath).catch(err => console.error("Temp cleanup failed:", err));
        }

        return NextResponse.json({
            fileUri: uploadResult.uri,
            name: uploadResult.name,
            mimeType: uploadResult.mimeType,
            state: uploadResult.state
        });

    } catch (error) {
        console.error("[upload-gemini] Error:", error instanceof Error ? error.stack || error.message : error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
