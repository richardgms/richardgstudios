import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { saveGeneration, enforceSessionLimit, getProjectById } from "@/lib/db";

const MODELS = {
    "veo-3.1": "veo-3.1-generate-preview",
    "veo-3.1-fast": "veo-3.1-fast-generate-preview",
} as const;

type ModelKey = keyof typeof MODELS;

function cleanBase64(str: string): string {
    return str.replace(/^data:image\/\w+;base64,/, "");
}

export async function POST(req: NextRequest) {
    try {
        const {
            prompt,
            model = "veo-3.1-fast",
            aspectRatio = "16:9",
            projectId,
            sessionId,
            attachments = [], // UI can send files
        } = await req.json();

        if (projectId) {
            const project = getProjectById(projectId);
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

        let referenceImages;
        if (attachments && attachments.length > 0) {
            const att = attachments[0];
            const rawContent = typeof att === "string" ? att : att.content;
            const mimeType = typeof att === "object" ? att.type : "image/jpeg";
            if (rawContent) {
                // Veo 3.1 typically accepts inlineData for reference images
                // The structure usually wraps into a part object: { inlineData: { ... } } or similar.
                // Assuming standard Gemini part structure for generative media.
                referenceImages = [{
                    image: { mimeType, imageBytes: cleanBase64(rawContent) }
                } as any];
            }
        }

        console.log(`[videos/generate] Triggering video generation. Model: ${actualModel}`);

        const operation = await ai.models.generateVideos({
            model: actualModel,
            prompt,
            config: {
                aspectRatio,
                // Only embed referenceImages if present
                ...(referenceImages ? { referenceImages } : {})
            }
        });

        if (!operation || !operation.name) {
            throw new Error("Failed to receive operation from Video API");
        }

        const genId = uuidv4();
        const folder = projectId || "_unsorted";

        // Registrar no banco com status 'processing' e anotado com o ID da operação
        saveGeneration({
            id: genId,
            projectId: projectId || undefined,
            sessionId: sessionId || undefined,
            prompt,
            model: modelKey,
            aspectRatio,
            imagePath: `storage/${folder}/temp_${genId}.mp4`, // placeholder
            mediaType: 'video',
            operationId: operation.name,
            status: 'processing'
        });

        if (sessionId) enforceSessionLimit(sessionId);

        return NextResponse.json({
            id: genId,
            operationId: operation.name,
            status: 'processing',
            mediaType: 'video',
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
