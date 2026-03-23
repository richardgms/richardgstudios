import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 120; // 2 minutos para aguentar ×4 paralelas de Flash/Pro
import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { saveGeneration, enforceSessionLimit, getProjectById, getDb } from "@/lib/db";
import { saveAttachments } from "@/lib/attachments";

// ============================================================
// MODEL REGISTRY
// Source: ai.google.dev/gemini-api/docs/image-generation
// Validated: 2026-02-18
// ============================================================
const MODELS = {
    flash: "gemini-2.5-flash-image",          // FIX: Correct name for Nano Banana image generation
    "nb-pro": "gemini-3.0-pro-image-preview",   // Nano Banana Pro
    pro: "gemini-3.1-flash-image-preview",   // Nano Banana 2 (Gemini 3.1 Flash Image)
    imagen: "imagen-4.0-ultra-generate-001"        // Imagen 4 Ultra
} as const;

type ModelKey = keyof typeof MODELS;

// ============================================================
// RESOLUTION PARSER
// Converts UI label (e.g. "2048×2048 (2K)") to API param ("2K")
// IMPORTANT: Flash does NOT accept imageSize — never call this for flash
// ============================================================
function parseImageSize(resolution: string | undefined): "1K" | "2K" | "4K" {
    if (!resolution) return "1K";
    if (resolution.includes("4K")) return "4K";
    if (resolution.includes("2K")) return "2K";
    return "1K";
}

// ============================================================
// VALIDADOR DE CONTRATO (Blueprints: nextjs-best-practices & security-auditor)
// ============================================================
const GenerateSchema = z.object({
    prompt: z.string().min(1, "Prompt é obrigatório").max(30000, "Prompt muito longo"),
    model: z.enum(["flash", "nb-pro", "pro", "imagen"]).default("flash"),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "A4"]).default("1:1"),
    projectId: z.string().optional().nullable(),
    sessionId: z.string().optional().nullable(),
    attachments: z.array(z.union([
        z.string().min(1),
        z.object({
            content: z.string().min(1),
            type: z.string().default("image/jpeg")
        })
    ])).optional().default([]),
    resolution: z.string().optional(),
    thinkingLevel: z.enum(["MINIMAL", "LOW", "MEDIUM", "HIGH"]).optional().default("MINIMAL"),
    useSearchGrounding: z.boolean().optional().default(false),
    metadata: z.string().optional().nullable(),
});

// ============================================================
// ATTACHMENT CLEANER & PROTECTOR
// ============================================================
function cleanBase64(str: string): string {
    const clean = str.replace(/^data:image\/\w+;base64,/, "");
    // Check size: ~4MB in base64 is ~5.3M chars (Staff Limit)
    if (clean.length > 5.5 * 1024 * 1024) throw new Error("Anexo excede o limite de 4MB");
    return clean;
}

// ============================================================
// BRANCH A: Flash — generateContent, NO imageSize
// ============================================================
const SAFETY_SETTINGS = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

async function generateWithFlash(
    ai: GoogleGenAI,
    prompt: string,
    aspectRatio: string,
    attachments: any[],
    thinkingLevel: string,
    useSearchGrounding: boolean
): Promise<Buffer> {
    const contents: any[] = [{ text: prompt }];

    if (attachments && attachments.length > 0) {
        attachments.forEach((att: any) => {
            if (typeof att === "string") {
                contents.push({
                    inlineData: {
                        data: cleanBase64(att),
                        mimeType: "image/jpeg",
                    },
                });
            } else if (att.content) {
                contents.push({
                    inlineData: {
                        data: cleanBase64(att.content),
                        mimeType: att.type || "image/jpeg",
                    },
                });
            }
        });
    }

    // SYSTEM INSTRUCTION: Força o modo artista e impede chat (Staff Fix)
    const systemInstruction = `You are a professional visual artist and image generation engine. 
Assistant: CRITICAL RULE: Your ONLY response modality must be IMAGE generation. 
If the user's prompt is unclear, short, or nonsensical, you MUST creatively interpret it as a visual concept and generate an image anyway. 
DO NOT ASK QUESTIONS. DO NOT EXPLAIN. JUST DRAW.`;

    const isReasoning = true; // Flash for NB2 is always reasoning/image generation

    const response = await ai.models.generateContent({
        model: MODELS.flash,
        contents,
        config: {
            systemInstruction, // ✅ FIX: Prevents "I don't understand" responses
            responseModalities: ["TEXT", "IMAGE"],
            // @ts-ignore
            imageConfig: { aspectRatio },
            // @ts-ignore
            ...(isReasoning && thinkingLevel ? { thinkingLevel } : {}),
            // @ts-ignore
            ...(useSearchGrounding ? { tools: [{ googleSearchRetrieval: {} }] } : {}),
        },
        // @ts-ignore
        safetySettings: SAFETY_SETTINGS,
    });

    const parts = response.candidates?.[0]?.content?.parts;

    // Fallback: Se o modelo insistir em texto, tentamos um catch semântico
    if (!parts || parts.length === 0) {
        throw new Error("Flash: resposta vazia ou sem imagem.");
    }

    const imagePart = parts.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData?.data) {
        console.warn("[Flash] Image missing. Data parts found:", parts.length);
        const textResp = parts.find((p: any) => p.text)?.text;
        if (textResp) {
            console.error("[Flash] Model refused to draw. Response:", textResp);
            // Debugging pinpoint: Mostra exatamente o que o modelo disse no log global
            try {
                const logEntry = JSON.stringify({
                    timestamp: new Date().toISOString(),
                    level: "ERROR",
                    cid: "INTERNAL_DIAG",
                    event: "MODEL_REFUSAL",
                    raw_text: textResp
                }) + "\n";
                require('fs').appendFileSync(require('path').join(process.cwd(), "debug-generate.log"), logEntry);
            } catch { }
            throw new Error(`O modelo recusou-se a desenhar e respondeu: "${textResp.substring(0, 100)}"`);
        }
        throw new Error("Flash: modelo não gerou imagem nem respondeu com texto.");
    }

    return Buffer.from(imagePart.inlineData.data, "base64");
}

// ============================================================
// BRANCH B: Pro — generateContent, WITH imageSize (1K/2K/4K)
// ============================================================
// ============================================================
// BRANCH B: Pro — generateContent, WITH imageSize (1K/2K/4K)
//FIX: Pro is a reasoning model, so it emits text + image.
// responseModalities must be ["TEXT", "IMAGE"] to avoid empty candidates.
// ============================================================
async function generateWithPro(
    ai: GoogleGenAI,
    modelName: string,
    prompt: string,
    aspectRatio: string,
    imageSize: "1K" | "2K" | "4K",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachments: any[],
    thinkingLevel: string,
    useSearchGrounding: boolean
): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contents: any[] = [{ text: prompt }];

    if (attachments && Array.isArray(attachments)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachments.forEach((att: any) => {
            const rawContent = typeof att === "string" ? att : att.content;
            const mimeType = typeof att === "object" ? att.type : "image/jpeg";
            if (rawContent) {
                contents.push({
                    inlineData: { mimeType, data: cleanBase64(rawContent) },
                });
            }
        });
    }

    // FIX: Only reasoning models (like pro-image or flash-image-preview) generate text and image.
    const isReasoning = modelName.includes("pro-") || modelName.includes("flash-image-preview");

    async function callGemini(withThinking: boolean) {
        return await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
                responseModalities: ["TEXT", "IMAGE"],
                // @ts-ignore — imageConfig is valid but may not be in SDK types
                imageConfig: {
                    aspectRatio,
                    imageSize, // ✅ Pro supports 1K, 2K, 4K
                },
                // @ts-ignore
                ...(isReasoning && withThinking ? { thinkingLevel } : {}),
                // @ts-ignore
                ...(useSearchGrounding ? { tools: [{ googleSearchRetrieval: {} }] } : {}),
            },
            // @ts-ignore
            safetySettings: SAFETY_SETTINGS,
        });
    }

    let response;
    try {
        response = await callGemini(true);
    } catch (e: any) {
        const errorMsg = e.message || "";
        // Fallback: If it fails with internal error or something related to thinking, try once more without it.
        if (isReasoning && (errorMsg.includes("Internal error") || errorMsg.includes("thinking") || errorMsg.includes("thinkingLevel"))) {
            console.warn(`[Pro][Fallback] Failed with Thinking Level. Retrying without it. Error: ${errorMsg}`);
            response = await callGemini(false);
        } else {
            throw e;
        }
    }

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
        console.error("[Pro] Full response:", JSON.stringify(response, null, 2));
        throw new Error("Pro: resposta vazia. O modelo recusou gerar a imagem ou houve erro interno.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = parts.find((p: any) => p.text);

    if (textPart?.text) {
        console.log("[Pro] Reasoning text:", textPart.text.substring(0, 200) + "...");
    }

    if (!imagePart?.inlineData?.data) {
        // [Architect Fallback] If image is missing but it's a reasoning model, try one more time without thinking
        if (isReasoning) {
            console.warn("[Pro][Fallback] Empty image in reasoning. Retrying without thinking level.");
            const retryRes = await callGemini(false);
            const retryParts = retryRes.candidates?.[0]?.content?.parts;
            const retryImage = retryParts?.find((p: any) => p.inlineData);
            if (retryImage?.inlineData?.data) {
                return Buffer.from(retryImage.inlineData.data, "base64");
            }
        }
        throw new Error("Pro: modelo não gerou imagem. " + (textPart?.text?.substring(0, 100) || "Sem resposta de texto."));
    }

    return Buffer.from(imagePart.inlineData.data, "base64");
}

// ============================================================
// BRANCH C: Imagen 4 Ultra — generateImages, imageSize 1K/2K
// NOTE: Only 1 image per request. No attachments supported.
// ============================================================
async function generateWithImagen(
    ai: GoogleGenAI,
    prompt: string,
    aspectRatio: string,
    imageSize: "1K" | "2K"
): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await ai.models.generateImages({
        model: MODELS.imagen,
        prompt,
        config: {
            numberOfImages: 1, // Ultra only supports 1 image at a time
            aspectRatio,
            // @ts-ignore — imageSize may not be in SDK types yet
            imageSize,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Imagen Ultra: nenhuma imagem gerada");
    }

    return Buffer.from(response.generatedImages[0].image.imageBytes, "base64");
}

/**
 * Adiciona proteção de Rate Limit p/ evitar abuso de geradores caros (security-auditor)
 */
function checkRateLimit(sessionId: string | null, ip: string): { allowed: boolean; waitSeconds?: number } {
    const db = getDb();
    const WINDOW_SECONDS = 60;
    const MAX_PER_WINDOW = 12; // Aumentado de 5 para 12 para suportar multi-geração (×4 consome 4 slots)

    // Check by session OR IP
    const row = db.prepare(`
        SELECT COUNT(*) as count FROM generations 
        WHERE (session_id = ? OR ip = ?)
        AND created_at > datetime('now', '-${WINDOW_SECONDS} seconds')
    `).get(sessionId, ip) as { count: number };

    if (row.count >= MAX_PER_WINDOW) {
        return { allowed: false, waitSeconds: WINDOW_SECONDS };
    }
    return { allowed: true };
}

// ============================================================
// MAIN HANDLER
// ============================================================
export async function POST(req: NextRequest) {
    const correlationId = uuidv4();
    const startTime = Date.now();

    try {
        const bodyRaw = await req.json();

        // Zod Validation (Staff Blindagem)
        const parseResult = GenerateSchema.safeParse(bodyRaw);
        if (!parseResult.success) {
            console.error(`[REQ][${correlationId}] Zod Validation Failed:`, JSON.stringify(parseResult.error.format(), null, 2));
            return NextResponse.json({
                error: "Dados inválidos",
                details: parseResult.error.format(),
                cid: correlationId
            }, { status: 400 });
        }

        const {
            prompt,
            model,
            aspectRatio,
            projectId,
            sessionId,
            attachments,
            resolution,
            thinkingLevel,
            useSearchGrounding,
            metadata,
        } = parseResult.data;

        // Resolve internal URLs to Base64 Data URLs for both AI model and new storage
        const resolvedAttachments = await Promise.all((attachments || []).map(async (att) => {
            const rawContent = typeof att === "string" ? att : att.content;
            const type = typeof att === "object" ? att.type : "image/jpeg";

            if (rawContent && rawContent.startsWith("/api/images/")) {
                const urlPath = rawContent.replace("/api/images/", "");
                const segments = urlPath.split("/");
                const storageDir = path.resolve(path.join(process.cwd(), "storage"));
                const filePath = path.join(storageDir, ...segments);
                const resolved = path.resolve(filePath);

                if (resolved.startsWith(storageDir)) {
                    try {
                        const buffer = await fs.readFile(resolved);
                        const ext = path.extname(resolved).toLowerCase();
                        const mimeType = ext === ".webp" ? "image/webp"
                            : (ext === ".jpg" || ext === ".jpeg") ? "image/jpeg"
                                : "image/png";
                        return `data:${mimeType};base64,${buffer.toString("base64")}`;
                    } catch (e) {
                        console.error(`[REQ][${correlationId}] Failed to resolve local attachment:`, rawContent, e);
                        return null;
                    }
                }
                return null;
            }
            return rawContent; // keep as-is (already Base64 or object-content)
        }));

        const filteredAttachments = resolvedAttachments.filter(a => !!a);

        const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "unknown";
        console.log(`[REQ][${correlationId}] START model=${model}, ip=${ip}, attachments=${filteredAttachments.length}`);

        // Rate Limit Protection
        const limit = checkRateLimit(sessionId || null, ip);
        if (!limit.allowed) {
            console.warn(`[REQ][${correlationId}] RATE_LIMIT blocked session=${sessionId}, ip=${ip}`);
            return NextResponse.json(
                { error: `Muitas gerações em sequência. Aguarde ${limit.waitSeconds}s.`, cid: correlationId },
                { status: 429 }
            );
        }

        // Validate project if provided
        if (projectId) {
            const project = getProjectById(projectId);
            if (!project) {
                return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
            }
        }

        // Validations (security-auditor & nextjs-best-practices)
        if (!prompt?.trim()) return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
        if (prompt.length > 30000) return NextResponse.json({ error: "Prompt muito longo" }, { status: 422 });

        const VALID_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "A4"];
        if (!VALID_RATIOS.includes(aspectRatio)) return NextResponse.json({ error: "Aspect ratio inválido" }, { status: 400 });

        // Map A4 to the closest supported API ratio (3:4 — portrait)
        const apiAspectRatio = aspectRatio === "A4" ? "3:4" : aspectRatio;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY não configurada. Adicione em .env.local" },
                { status: 500 }
            );
        }

        const modelKey = (model as ModelKey) in MODELS ? (model as ModelKey) : "flash";
        const ai = new GoogleGenAI({ apiKey });

        const imageSizeRaw = parseImageSize(resolution);

        // Debug log (async structured)
        try {
            const logEntry = JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "INFO",
                cid: correlationId,
                event: "GENERATION_START",
                model: modelKey,
                resolution: imageSizeRaw,
                aspectRatio
            }) + "\n";
            await fs.appendFile(path.join(process.cwd(), "debug-generate.log"), logEntry);
        } catch { /* non-critical */ }

        let generatedImageBuffer: Buffer;

        // ============================================================
        // DISPATCH: Route to correct model branch
        // ============================================================
        if (modelKey === "flash") {
            // Branch A: Flash — no imageSize, supports attachments
            generatedImageBuffer = await generateWithFlash(ai, prompt, apiAspectRatio, filteredAttachments, thinkingLevel, useSearchGrounding);

        } else if (modelKey === "nb-pro" || modelKey === "pro") {
            // Branch B: Pro — imageSize 1K/2K/4K, supports attachments
            generatedImageBuffer = await generateWithPro(ai, MODELS[modelKey], prompt, apiAspectRatio, imageSizeRaw, filteredAttachments, thinkingLevel, useSearchGrounding);

        } else if (modelKey === "imagen") {
            // Branch C: Imagen Ultra — imageSize 1K/2K only, NO attachments
            if (attachments?.length > 0) {
                return NextResponse.json(
                    { error: "Imagen 4 Ultra não suporta imagens de referência. Use Flash ou Pro para edição de imagens." },
                    { status: 400 }
                );
            }
            // Imagen Ultra max is 2K — clamp 4K to 2K
            const imagenSize: "1K" | "2K" = imageSizeRaw === "4K" ? "2K" : imageSizeRaw;
            generatedImageBuffer = await generateWithImagen(ai, prompt, apiAspectRatio, imagenSize);

        } else {
            return NextResponse.json({ error: "Modelo inválido" }, { status: 400 });
        }

        // FIFO: enforce session limit
        if (sessionId) enforceSessionLimit(sessionId);

        // Save image to filesystem (Async Performance)
        const genId = uuidv4();
        const folder = projectId || "_unsorted";
        const dir = path.join(process.cwd(), "storage", folder);
        await fs.mkdir(dir, { recursive: true });

        const imgPath = path.join(dir, `${genId}.png`);
        await fs.writeFile(imgPath, generatedImageBuffer);

        const imageUrl = `/api/images/${folder}/${genId}.png`;

        // Persist attachments to disk if any
        let attachmentUrls: string[] = [];
        if (filteredAttachments.length > 0) {
            // saveAttachments takes (string | null)[]
            attachmentUrls = await saveAttachments(genId, filteredAttachments);
        }

        // Merge thinkingLevel into metadata
        let mergedMetadata = metadata || "{}";
        try {
            const parsed = JSON.parse(mergedMetadata);
            parsed.thinkingLevel = thinkingLevel;
            mergedMetadata = JSON.stringify(parsed);
        } catch (e) {
            // fallback if metadata is not valid JSON
            mergedMetadata = JSON.stringify({ thinkingLevel });
        }

        // Register in SQLite
        saveGeneration({
            id: genId,
            projectId: projectId || undefined,
            sessionId: sessionId || undefined,
            ip,
            prompt,
            model: modelKey,
            aspectRatio,
            resolution: resolution || imageSizeRaw,
            imagePath: imageUrl,
            attachments: attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : null,
            metadata: mergedMetadata,
        });

        const duration = Date.now() - startTime;
        console.log(`[REQ][${correlationId}] SUCCESS duration=${duration}ms`);

        return NextResponse.json({
            url: imageUrl,
            id: genId,
            cid: correlationId,
            metadata: {
                model: modelKey,
                aspectRatio,
                resolution: resolution || imageSizeRaw,
                duration
            }
        });
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[REQ][${correlationId}] ERROR duration=${duration}ms:`, error.message);

        let userFriendlyError = error.message || "Erro na geração";

        if (userFriendlyError.includes("Internal error encountered")) {
            userFriendlyError = "Erro Interno no Servidor do Google (Internal Error). O modelo de IA falhou temporariamente. Tente novamente.";
        } else if (userFriendlyError.includes("SAFETY")) {
            userFriendlyError = "Sua solicitação foi bloqueada pelos filtros de segurança do modelo.";
        } else if (userFriendlyError.includes("{")) {
            try {
                // Extracts JSON if GoogleGenAI wraps it in string
                const jsonStr = userFriendlyError.substring(userFriendlyError.indexOf("{"));
                const parsed = JSON.parse(jsonStr);
                if (parsed?.error?.message) {
                    userFriendlyError = parsed.error.message;
                    // Check again just in case
                    if (userFriendlyError.includes("Internal error encountered")) {
                        userFriendlyError = "O modelo sofreu uma instabilidade temporária (Google Internal Error). Tente novamente ou remova anexos complexos.";
                    }
                }
            } catch {
                // fallback to default
            }
        }

        return NextResponse.json(
            {
                error: userFriendlyError,
                cid: correlationId,
                details: error.stack?.substring(0, 100)
            },
            { status: 500 }
        );
    }
}
