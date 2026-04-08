import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { saveGeneration, enforceSessionLimit, getProjectById } from "@/lib/db";

const MODELS = {
    "veo-3.1": "veo-3.1-generate-preview",
    "veo-3.1-fast": "veo-3.1-fast-generate-preview",
    "veo-3.1-lite": "veo-3.1-lite-generate-preview",
} as const;

type ModelKey = keyof typeof MODELS;

type AttachmentInput = string | { content: string; type?: string };

/**
 * Parses an attachment (data URL string or {content, type} object) into the
 * `{ imageBytes, mimeType }` structure expected by the Gemini Video API.
 * Returns null if the content is missing or not a valid base64 data URL.
 */
function parseAttachment(att: AttachmentInput): { imageBytes: string; mimeType: string } | null {
    const rawContent = typeof att === "string" ? att : att.content;
    if (!rawContent || typeof rawContent !== "string") return null;

    const match = rawContent.match(/^data:(image\/[\w+]+);base64,(.+)$/s);
    if (match) {
        return { mimeType: match[1], imageBytes: match[2] };
    }

    // Fallback: raw base64 without data URL prefix (accept with explicit type)
    if (typeof att === "object" && att.type && !rawContent.startsWith("data:")) {
        return { mimeType: att.type, imageBytes: rawContent };
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const {
            prompt,
            model = "veo-3.1-fast",
            aspectRatio = "16:9",
            resolution,
            durationSeconds,
            negativePrompt,
            projectId,
            sessionId,
            attachments = [],
        } = await req.json();

        if (projectId) {
            const project = await getProjectById(projectId);
            if (!project) {
                return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
            }
        }

        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY não configurada." },
                { status: 500 }
            );
        }

        const modelKey = (model in MODELS) ? (model as ModelKey) : "veo-3.1-fast";
        const actualModel = MODELS[modelKey];
        const ai = new GoogleGenAI({ apiKey });

        // Attachment handling:
        // - 1 attachment  → image-to-video: the image is animated as the first frame
        // - 2 attachments → first+last frame interpolation: Veo generates a transition between them
        const firstFrame = Array.isArray(attachments) && attachments[0]
            ? parseAttachment(attachments[0] as AttachmentInput)
            : null;
        const lastFrame = Array.isArray(attachments) && attachments[1]
            ? parseAttachment(attachments[1] as AttachmentInput)
            : null;

        // lastFrame requires firstFrame — guard against broken payloads
        const resolvedLastFrame = firstFrame && lastFrame ? lastFrame : null;

        console.log(
            `[videos/generate] model=${actualModel} firstFrame=${!!firstFrame} lastFrame=${!!resolvedLastFrame}`
        );

        const operation = await ai.models.generateVideos({
            model: actualModel,
            prompt,
            // `image` is a top-level param (not inside config) per the Gemini API spec
            ...(firstFrame ? { image: firstFrame } : {}),
            config: {
                aspectRatio,
                ...(resolution ? { resolution } : {}),
                ...(durationSeconds ? { durationSeconds } : {}),
                ...(negativePrompt?.trim() ? { negativePrompt: negativePrompt.trim() } : {}),
                ...(resolvedLastFrame ? { lastFrame: resolvedLastFrame } : {}),
            },
        });

        if (!operation || !operation.name) {
            throw new Error("Failed to receive operation from Video API");
        }

        const genId = uuidv4();
        const folder = projectId || "_unsorted";

        await saveGeneration({
            id: genId,
            projectId: projectId || undefined,
            sessionId: sessionId || undefined,
            prompt,
            model: modelKey,
            aspectRatio,
            resolution: resolution || undefined,
            imagePath: `storage/${folder}/temp_${genId}.mp4`,
            mediaType: "video",
            operationId: operation.name,
            status: "processing",
        });

        if (sessionId) await enforceSessionLimit(sessionId);

        return NextResponse.json({
            id: genId,
            operationId: operation.name,
            status: "processing",
            mediaType: "video",
            message: "Video generation started successfully",
            createdAt: new Date().toISOString(),
        });

    } catch (err) {
        console.error("[videos/generate] erro na requisição:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Erro interno" },
            { status: 500 }
        );
    }
}
