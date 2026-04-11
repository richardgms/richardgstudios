import { NextRequest } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { SavedAttachment } from "@/lib/db";
import { THOMAS_SYSTEM_PROMPT, LIBRARY_SYSTEM_PROMPT, AURORA_SYSTEM_PROMPT } from "@/lib/system-prompts";

// ─── Component 1: extractSearchTerms ─────────────────────────────────────────
const PT_STOP_WORDS = new Set([
    "para", "com", "uma", "um", "de", "do", "da", "no", "na", "em",
    "que", "me", "eu", "quero", "preciso", "busque", "encontre",
    "procure", "criar", "crie", "fazer", "faça", "gerar", "gere",
    "prompt", "imagem", "foto", "visual", "estilo", "tipo", "sobre",
    "como", "qual", "onde", "quando", "por", "mais", "muito", "bem",
    "isso", "este", "essa", "aqui", "ali", "ter", "ser", "está",
]);

function extractSearchTerms(userMessage: string): string[] {
    const words = userMessage
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !PT_STOP_WORDS.has(w));

    return [...new Set(words)].slice(0, 3);
}

type ChatAttachment = {
    base64?: string;
    type: string;
    fileUri?: string;
    name?: string;
};

type ChatMessage = {
    role: string;
    content: string;
    attachments?: ChatAttachment[];
};

type LibrarySearchResult = {
    content?: string;
    sourceMedia?: string[];
    score?: number;
    title: string;
    description: string;
    category: string;
    needReferenceImages?: boolean;
};

type CharacterRow = {
    name: string;
    description?: string | null;
};

type ChatContentPart =
    | { text: string }
    | { fileData: { mimeType: string; fileUri: string } }
    | { inlineData: { mimeType: string; data: string } };

type ChatContent = {
    role: "user" | "model";
    parts: ChatContentPart[];
};

type ChatRequestBody = {
    messages?: ChatMessage[];
    model?: keyof typeof MODELS | string;
    sessionId?: string | null;
    libraryMode?: boolean;
    agent?: "thomas" | "aurora" | string;
    attachments?: Attachment[];
    webSearch?: boolean;
};

function getErrorStatus(err: unknown): number {
    if (typeof err === "object" && err !== null && "status" in err) {
        const status = (err as { status?: unknown }).status;
        if (typeof status === "number") return status;
    }
    return 500;
}

// ─── System Prompts ───────────────────────────────────────────────────────────
// System prompts are imported from @/lib/prompts

const MODELS = {
    flash: "gemini-2.5-flash",
    pro: "gemini-2.5-pro",
    "flash-3.1": "gemini-3-flash-preview",
    "pro-3.1": "gemini-3.1-pro-preview",
};

interface Attachment {
    base64?: string;
    type: string;
    fileUri?: string;
    name?: string;
}

export async function POST(req: NextRequest) {
    try {
        const {
            messages: rawMessages,
            model = "flash",
            sessionId,
            libraryMode = false,
            agent = "thomas",
            attachments = [],
            webSearch = false,
        } = await req.json() as ChatRequestBody;

        // Strip base64 from historical messages — only the current message carries attachments
        const messages = rawMessages?.map((m) => ({
            ...m,
            attachments: m.attachments?.map((a) => ({ ...a, base64: undefined })),
        }));

        if (!messages?.length) {
            return Response.json({ error: "Mensagens são obrigatórias" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });
        }

        // ─── Session management ───────────────────────────────────────────────
        let currentSessionId = sessionId;
        const lastMessage = messages[messages.length - 1];

        if (!currentSessionId && lastMessage.role === "user") {
            const { createChatSession } = await import("@/lib/db");
            const title = lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "");
            currentSessionId = await createChatSession(title, agent);
        }

        if (currentSessionId && lastMessage.role === "user") {
            const { addChatMessage } = await import("@/lib/db");
            // Await message text save — reliable, fast (~5ms DB write)
            const msgId = await addChatMessage(currentSessionId, "user", lastMessage.content);

            // Thumbnails are best-effort: fire-and-forget so stream starts immediately
            const imageAttachments = attachments.filter(att => att.base64 && att.type.startsWith("image/"));
            if (imageAttachments.length > 0) {
                const sid = currentSessionId;
                void (async () => {
                    try {
                        const { saveImage, } = await import("@/lib/blob-storage");
                        const { updateChatMessageAttachments } = await import("@/lib/db");
                        const sharp = (await import("sharp")).default;
                        const ts = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                        const saved = (await Promise.all(
                            imageAttachments.map(async (att, i) => {
                                try {
                                    const buf = Buffer.from(att.base64!, "base64");
                                    const thumb = await sharp(buf)
                                        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
                                        .webp({ quality: 65 })
                                        .toBuffer();
                                    const url = await saveImage(`_chat/${sid}/${ts}_${i}.webp`, thumb);
                                    return { url, type: att.type, name: att.name };
                                } catch { return null; }
                            })
                        )).filter(Boolean) as SavedAttachment[];
                        if (saved.length) await updateChatMessageAttachments(msgId, saved);
                    } catch { /* non-critical */ }
                })();
            }
        }

        // ─── Library search ───────────────────────────────────────────────────
        let libraryContext = "";
        if (libraryMode && lastMessage.role === "user") {
            try {
                const primaryQuery = lastMessage.content.trim().slice(0, 200);
                const secondaryTerms = extractSearchTerms(lastMessage.content);
                const multiQuery = [primaryQuery, ...secondaryTerms].filter(Boolean).join("|");

                const searchUrl = new URL("/api/prompts/search", req.url);
                searchUrl.searchParams.set("q", multiQuery);
                searchUrl.searchParams.set("limit", "10");

                const searchRes = await fetch(searchUrl.toString());
                if (!searchRes.ok) throw new Error(`Search API returned ${searchRes.status}`);

                const searchData = await searchRes.json() as { results?: LibrarySearchResult[] };
                const MAX_CONTENT_CHARS = 150;

                const results = searchData.results ?? [];
                if (results.length > 0) {
                    libraryContext = "\n\n--- RESULTADOS DA BUSCA NA BIBLIOTECA ---\n" +
                        results.map((r, i) => {
                            const contentPreview = (r.content ?? "").length > MAX_CONTENT_CHARS
                                ? `${r.content?.slice(0, MAX_CONTENT_CHARS) ?? ""}...[truncated]`
                                : (r.content ?? "");
                            const sourceMedia = r.sourceMedia ?? [];
                            const mediaStr = sourceMedia.length > 0 ? `\nSourceMedia: ${sourceMedia.join(", ")}` : "";
                            const scoreStr = r.score !== undefined ? `\nScore: ${r.score.toFixed(3)}` : "";
                            return `\n[${i + 1}] Título: ${r.title}\nDescrição: ${r.description}\nCategoria: ${r.category}\nRequer referência: ${r.needReferenceImages ? "Sim" : "Não"}${scoreStr}${mediaStr}\nPrompt:\n${contentPreview}\n`;
                        }).join("\n---\n");
                } else {
                    libraryContext = "\n\n--- BUSCA NA BIBLIOTECA ---\nNenhum prompt encontrado. Gere um prompt customizado e avise que é 🤖 AI-generated.";
                }
            } catch (err) {
                console.error("Library search error:", err);
                libraryContext = "\n\n[Erro na busca da biblioteca. Gere um prompt customizado e indique que é 🤖 AI-generated.]";
            }
        }

        const ai = new GoogleGenAI({ apiKey });

        // ─── Character Vault context ──────────────────────────────────────────
        let characterContext = "";
        if (agent === "thomas" && lastMessage.role === "user") {
            try {
                const { getCharacters } = await import("@/lib/db");
                const allChars = await getCharacters() as CharacterRow[];
                const queryTerms = extractSearchTerms(lastMessage.content);
                const matched = allChars.filter((c) =>
                    queryTerms.some(term =>
                        c.name.toLowerCase().includes(term) ||
                        (c.description || "").toLowerCase().includes(term)
                    )
                );

                if (matched.length > 0) {
                    characterContext = "\n\n--- PERSONAGENS SALVOS NO VAULT (REFERÊNCIA) ---\n" +
                        matched.map((c) => `- ${c.name}: ${c.description || "Sem descrição"}`).join("\n") +
                        "\nInstrução: Se o usuário citou um destes personagens, cite o nome dele no prompt e instrua o usuário a anexar as referências nos Slots.\n\n";
                }
            } catch (err) {
                console.error("Character Vault context injection failed:", err);
            }
        }

        const modelName = MODELS[model as keyof typeof MODELS] || MODELS.flash;

        let systemPrompt: string;
        let systemGreeting: string;

        if (libraryMode) {
            systemPrompt = libraryContext + LIBRARY_SYSTEM_PROMPT + characterContext;
            systemGreeting = "Entendido! Sou seu Especialista em Síntese de Prompts da Biblioteca Nano Banana Pro. Descreva o que precisa e vou buscar, analisar e sintetizar o melhor prompt para você! 📚✨";
        } else if (agent === "aurora") {
            systemPrompt = AURORA_SYSTEM_PROMPT;
            systemGreeting = "Pronto! Sou a Aurora, sua diretora criativa de vídeo. Me conta a ideia — vamos do conceito ao prompt otimizado para o Veo juntos. Pode mandar uma ideia vaga, um roteiro ou até um vídeo pra eu analisar. 🎬";
        } else {
            systemPrompt = characterContext + THOMAS_SYSTEM_PROMPT;
            systemGreeting = "Entendido! Sou seu Arquiteto de Prompts Multimodal. Descreva sua ideia ou envie referências visuais — vou montar o prompt perfeito para o gerador. 🎨";
        }

        const augmentedMessages = libraryMode && libraryContext
            ? [
                ...messages.slice(0, -1),
                { ...messages[messages.length - 1], content: messages[messages.length - 1].content + libraryContext },
            ]
            : messages;

        const contents: ChatContent[] = [];

        for (let i = 0; i < augmentedMessages.length; i++) {
            const m = augmentedMessages[i];
            const parts: ChatContentPart[] = [{ text: m.content }];

            if (i === augmentedMessages.length - 1 && m.role === "user" && attachments?.length > 0) {
                const processedAttachments = await Promise.all(attachments.map(async (att: Attachment) => {
                    if (att.fileUri && att.name) {
                        try {
                            let fileState = await ai.files.get({ name: att.name });
                            let pollCount = 0;
                            while (fileState.state === "PROCESSING" && pollCount < 15) {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                fileState = await ai.files.get({ name: att.name });
                                pollCount++;
                            }
                            if (fileState.state === "FAILED") {
                                throw new Error(`O processamento do arquivo ${att.name} falhou na nuvem.`);
                            }
                            if (fileState.state === "PROCESSING") {
                                throw new Error(`O arquivo ${att.name} ainda está sendo processado. Tente novamente.`);
                            }
                            // Use the mimeType from the file state if available (more reliable)
                            const resolvedMime = fileState.mimeType || att.type;
                            return { fileData: { mimeType: resolvedMime, fileUri: att.fileUri } };
                        } catch (err) {
                            console.error("[Chat] Error processing attachment:", att.name, err);
                            return null;
                        }
                    } else if (att.base64) {
                        const base64Data = att.base64.replace(/^data:.*?;base64,/, "");
                        return { inlineData: { mimeType: att.type, data: base64Data } };
                    }
                    return null;
                }));

                const validAttachments = processedAttachments.filter(
                    (att): att is NonNullable<(typeof processedAttachments)[number]> => Boolean(att)
                );
                if (validAttachments.length > 0) parts.push(...validAttachments);
            }

            contents.push({
                role: m.role === "assistant" ? "model" as const : "user" as const,
                parts,
            });
        }

        // ─── Streaming response ───────────────────────────────────────────────
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullText = "";

                try {
                    const isGemini3 = modelName.startsWith("gemini-3");
                    const thinkingLevel = isGemini3
                        ? (modelName.includes("pro") ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW)
                        : undefined;

                    // Google Search Grounding: supported on all Gemini models including Gemini 3 preview
                    const enableGrounding = webSearch;
                    console.log(`[Chat] Sending to model=${modelName}, contents=${contents.length} messages, thinking=${thinkingLevel ?? "default"}, webSearch=${enableGrounding}, last parts=${contents[contents.length - 1]?.parts?.length}`);
                    const genStream = await ai.models.generateContentStream({
                        model: modelName,
                        contents,
                        config: {
                            systemInstruction: systemPrompt,
                            ...(thinkingLevel && { thinkingConfig: { thinkingLevel } }),
                            ...(enableGrounding && { tools: [{ googleSearch: {} }] }),
                        },
                    });

                    for await (const chunk of genStream) {
                        if (req.signal.aborted) break;

                        const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (chunkText) {
                            fullText += chunkText;
                            controller.enqueue(encoder.encode(JSON.stringify({ text: chunkText }) + "\n"));
                        }
                    }

                    controller.enqueue(encoder.encode(JSON.stringify({ done: true, sessionId: currentSessionId }) + "\n"));

                    if (currentSessionId && fullText) {
                        const { addChatMessage } = await import("@/lib/db");
                        addChatMessage(currentSessionId, "assistant", fullText);
                    }
                } catch (err: unknown) {
                    console.error(`[Chat] Stream error (model=${modelName}):`, err);
                    if (!req.signal.aborted) {
                        const status = getErrorStatus(err);
                        const message = err instanceof Error ? err.message : JSON.stringify(err);
                        const errorMsg = status === 429
                            ? "Atingimos o limite da API da Inteligência Artificial. Por favor, aguarde alguns instantes."
                            : status === 413
                                ? "O tamanho do anexo excede o limite permitido pela plataforma."
                                : status === 400
                                    ? "A requisição contém um argumento inválido. Verifique se o anexo ainda é válido ou tente enviar novamente."
                                    : `Ocorreu uma falha inesperada na comunicação com o modelo de IA. Detalhe: ${message}`;
                        controller.enqueue(encoder.encode(JSON.stringify({ error: errorMsg, code: status }) + "\n"));
                    }
                    if (currentSessionId && fullText) {
                        try {
                            const { addChatMessage } = await import("@/lib/db");
                            addChatMessage(currentSessionId, "assistant", fullText);
                        } catch { /* silent */ }
                    }
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/x-ndjson",
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        });

    } catch (err: unknown) {
        console.error("Erro no chat:", err);
        const status = getErrorStatus(err);
        const errorMsg = status === 429
            ? "Atingimos o limite da API da Inteligência Artificial. Por favor, aguarde alguns instantes."
            : status === 413
                ? "O tamanho da requisição excede o limite permitido."
                : "Erro interno do servidor na comunicação com a API.";

        return Response.json({ error: errorMsg, code: status }, { status });
    }
}
