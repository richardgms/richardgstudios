import { NextResponse } from "next/server";

/**
 * Initiates a resumable upload to the Google Generative AI Files API.
 *
 * Architecture: The client sends only metadata (fileName, mimeType, fileSize) as JSON.
 * The server initiates a resumable upload session with Google using the API key,
 * and returns the upload URL. The client then uploads the file directly to Google,
 * bypassing Vercel's 4.5MB serverless function body size limit.
 */
export async function POST(req: Request) {
    try {
        const { fileName, mimeType, fileSize } = await req.json();

        if (!fileName || !mimeType || !fileSize) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const MAX_SIZE_MB = 20;
        if (fileSize > MAX_SIZE_MB * 1024 * 1024) {
            return NextResponse.json(
                { error: `File exceeds the maximum ${MAX_SIZE_MB}MB limit` },
                { status: 413 }
            );
        }

        const validTypes = ["video/mp4", "video/webm", "video/quicktime", "application/pdf"];
        if (!validTypes.includes(mimeType) && !mimeType.startsWith("image/")) {
            return NextResponse.json(
                { error: "Invalid file type. Only videos, images, and PDFs are allowed." },
                { status: 415 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        // Initiate resumable upload with Google — only sends metadata, not the file
        const initRes = await fetch(
            `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "X-Goog-Upload-Protocol": "resumable",
                    "X-Goog-Upload-Command": "start",
                    "X-Goog-Upload-Header-Content-Length": String(fileSize),
                    "X-Goog-Upload-Header-Content-Type": mimeType,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ file: { displayName: fileName } }),
            }
        );

        if (!initRes.ok) {
            const errText = await initRes.text();
            console.error("[upload-gemini] Google init failed:", initRes.status, errText);
            return NextResponse.json(
                { error: `Google upload init failed (${initRes.status})` },
                { status: 502 }
            );
        }

        const uploadUrl = initRes.headers.get("X-Goog-Upload-URL") || initRes.headers.get("x-goog-upload-url");
        if (!uploadUrl) {
            console.error("[upload-gemini] No upload URL in response headers");
            return NextResponse.json({ error: "No upload URL returned by Google" }, { status: 502 });
        }

        return NextResponse.json({ uploadUrl });

    } catch (error) {
        console.error("[upload-gemini] Error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
