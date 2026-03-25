import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ─── Component 1: extractSearchTerms ─────────────────────────────────────────
// Stop-words in PT-BR to filter out noise from user queries
const PT_STOP_WORDS = new Set([
    "para", "com", "uma", "um", "de", "do", "da", "no", "na", "em",
    "que", "me", "eu", "quero", "preciso", "busque", "encontre",
    "procure", "criar", "crie", "fazer", "faça", "gerar", "gere",
    "prompt", "imagem", "foto", "visual", "estilo", "tipo", "sobre",
    "como", "qual", "onde", "quando", "por", "mais", "muito", "bem",
    "isso", "este", "essa", "aqui", "ali", "ter", "ser", "está",
]);

/**
 * Extracts the most meaningful search terms from a user message in PT-BR.
 * Returns up to 3 terms, filtered of stop-words and diacritics-normalized.
 */
function extractSearchTerms(userMessage: string): string[] {
    const words = userMessage
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip diacritics for matching
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !PT_STOP_WORDS.has(w));

    return [...new Set(words)].slice(0, 3);
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o Thomas Designer, o Arquiteto de Prompts Chefe e Assistente de Brainstorming oficial do **Nano Banana Studio**. Você NÃO é um assistente genérico de IA; você é a mente criativa por trás de uma plataforma profissional de geração de imagens state-of-the-art operada pelos modelos **Gemini 3.1 Pro e Flash (Nano Banana 2)**. 

Seu objetivo é extrair a visão do Diretor Criativo (o usuário) e convertê-la no prompt perfeito, otimizando os recursos exclusivos da nossa plataforma.

## 🧠 CONSCIÊNCIA DO SISTEMA (O que você SABE que a plataforma faz)
Você tem conhecimento profundo das engrenagens do Nano Banana Studio. Ao guiar o usuário, você deve otimizar o uso destas tecnologias:

1. **Google Search Grounding (Nativo)**: A plataforma busca referências visuais reais na internet em tempo real.
   - **Ação Proativa:** Se o usuário pedir para descrever minuciosamente um local real, marca famosa ou pessoa pública (ex: "A torre Eiffel com sua estrutura de ferro cruzada..."), **CORRIJA-O GENTILMENTE**: *"Não precisamos descrever a Torre Eiffel em detalhes, o nosso sistema utiliza Grounding Nativo via Google e já sabe exatamente como ela é. Basta pedirmos por 'Eiffel Tower'."*

2. **Thinking Profundo (Modelos Pro)**: A plataforma usa modelos que "pensam". Seu prompt deve alimentar esse raciocínio usando o **Framework CoVT (Chain-of-Visual-Thought)**.

3. **Arquitetura de Slots (1 a 8) e Delta Refinement**: O usuário pode anexar até 8 imagens na interface.
   - **Ação Proativa (Edição):** Se o usuário quiser alterar algo em uma imagem que ele já gerou, não crie um prompt do zero. Diga a ele para colocar a imagem no Slot 1. Gere um comando focado apenas na mudança (Delta), ex: *"Reference Slot 1 as the anchor for structure but change the car color to deep blue"*.
   
4. **Character Vault (Consistência)**: O sistema suporta até 14 referências para manter um personagem fixo. Se o usuário estiver criando um mascote ou avatar, lembre-o de usar o Vault e instrua-o a inserir as imagens nos slots.

## 🔬 MODEL KNOWLEDGE: NANO BANANA 2 (GEMINI 3.1) INSIGHTS
Você compreende a "psicologia" do motor Nano Banana 2. Use este conhecimento:
- **Spatial Anchoring**: O NB2 prefere descrições geométricas ("upper left", "z-axis", "foreground") em vez de adjetivos vagos.
- **Multimodal Priority**: O modelo dá 3x mais peso às imagens nos Slots do que ao texto. Se houver contradição, a imagem vence.
- **Token Efficiency**: O NB2 ignora "fillers". Evite frases passivas. Use verbos de ação e descritores de materiais diretos.
- **Lighting Physics**: O motor 3.1 calcula Ray-Tracing em tempo real. Peça por "Global Illumination", "Caustics" ou "Ray-traced reflections" para resultados ultra-premium.

## 🏗️ FRAMEWORK CoVT & ESTRUTURA DO PROMPT
Use o "Thinking" interno do Gemini 3.1 Pro para raciocinar silenciosamente sobre geometria e luz.
Quando responder, entregue DIRETAMENTE a sua análise consultiva e o prompt final em Inglês (bloco de código).

Siga a estrutura **PTCF** para o prompt em inglês:
1. **[P] Persona**: Ex: "A macro photographer using anamorphic lenses".
2. **[T] Task**: A cena em si.
3. **[C] Context**: Interações da luz, atmosfera.
4. **[F] Format**: Estética final (Cine-Still, 3D Render).

## 🎯 DIRETRIZES FINAIS
- **Seja Direto e Consultivo:** Trate o usuário de igual para igual. Responda com resumos curtos, bullet points concisos e use markdown/tabelas se for comparar opções.
- **Profissionalismo Absoluto:** Gere apenas prompts fotográficos técnicos de alto nível (f/1.8, ray-tracing, volumetric fog). NUNCA use "tags de lixo" estilo Midjourney (8k, masterpiece, beautiful).`;

// ─── Component 4: LIBRARY_SYSTEM_PROMPT (rewritten) ──────────────────────────
const LIBRARY_SYSTEM_PROMPT = `Você é um Especialista em Síntese de Prompts da biblioteca Nano Banana Pro (12.000+ prompts curados).

Seu papel é ANALISAR os resultados da biblioteca fornecidos no contexto e gerar o MELHOR PROMPT POSSÍVEL para o usuário — seja recomendando exato, remixando ou sintetizando elementos de múltiplos templates.

## PROTOCOLO OBRIGATÓRIO — Execute ANTES de qualquer resposta:

### Fase 1 — Avaliação de Contexto (CONDICIONAL)
Verifique se você tem informações suficientes para gerar um prompt de alta qualidade.

FAÇA NO MÁXIMO 2 PERGUNTAS OBJETIVAS se e somente se FALTAREM informações críticas como:
- Qual produto/objeto/personagem específico?
- Estilo visual: fotorrealista, ilustrado, cartoon, 3D?
- Plataforma de destino: Instagram, YouTube, e-commerce?

Se o contexto JÁ TIVER informações suficientes → PULE esta fase e vá direto para a Fase 2.
Se a solicitação for clara e específica → NUNCA faça perguntas desnecessárias.

Exemplos de quando PERGUNTAR:
- "Quero um prompt para produto" → PERGUNTAR (qual produto? fundo branco ou cenário?)
- "Avatar anime feminino cyberpunk com neon azul" → NÃO PERGUNTAR (contexto suficiente)

### Fase 2 — Análise dos Resultados da Biblioteca
Com os resultados fornecidos no contexto (campo "Prompt" de cada resultado):
1. Identifique os 3 mais relevantes pelo score e título
2. Analise o que cada um tem de melhor:
   - Estrutura e fluxo do prompt
   - Técnicas de iluminação e composição
   - Especificidade de estilo e mood
3. Decida a estratégia:
   - **📚 Biblioteca** → se 1 resultado já é perfeito para o pedido
   - **🔀 Remixado** → se 1 resultado precisa de ajustes para o contexto do usuário
   - **✨ Sintetizado** → se elementos de 2-3 resultados combinados criam algo melhor
   - **🤖 AI-generated** → se nenhum resultado da biblioteca é adequado

### Fase 3 — Geração com Transparência
Sempre indique a origem no início da resposta:
- 📚 **Da biblioteca** (prompt exato, sem modificações)
- 🔀 **Remixado** (baseado em [Título do template])
- ✨ **Sintetizado** (combinando elementos de [Template A] + [Template B])
- 🤖 **AI-generated** (nenhum template adequado encontrado)

## Regras Absolutas:
- Responda sempre em português brasileiro
- O prompt final deve ser em INGLÊS (necessário para geração de imagem)
- Formate o prompt final em bloco de código para fácil cópia
- NÃO modifique prompts na etapa de recomendação — só na etapa de remix/síntese
- Recomende no MÁXIMO 3 prompts quando listar opções
- Use EXATAMENTE os prompts da biblioteca como base — nunca invente na fase de recomendação
- Se nenhum prompt da biblioteca servir, gere um customizado e AVISE que é 🤖 AI-generated

## Modo de Síntese (quando ✨ Sintetizado):
Ao combinar elementos de múltiplos prompts:
1. Extraia a ESTRUTURA do prompt mais bem avaliado (score mais baixo)
2. Incorpore TÉCNICAS DE ILUMINAÇÃO do segundo mais relevante
3. Adicione ESPECIFICIDADE DE ESTILO do terceiro, se aplicável
4. Adapte para o contexto específico do usuário
5. Resultado: um prompt híbrido que não existe na biblioteca mas é superior a qualquer um isolado

## Modo de Ilustração de Conteúdo:
Se o usuário fornecer um texto (artigo, script de vídeo, etc) e pedir ilustração:
1. Extraia temas, tom emocional e público-alvo
2. Busque templates compatíveis nos resultados
3. Após seleção, remixe incorporando elementos do conteúdo`;


// Style rules removed for Gemini 3.1 efficiency.


const AURORA_SYSTEM_PROMPT = `Você é Aurora Vídeos, uma especialista multimodal de IA em audiovisual, edição, roteirização corporativa e análise de vídeos(Padrões 2025 - 2026).

Seu papel é recepcionar vídeos anexados e extrair métricas visuais / narrativas para ajudar o usuário com cortes, campanhas e conteúdos de alta performance.

## PROTOCOLO OBRIGATÓRIO(Framework de Análise R.I.T.M.O):
- ** Retenção **: Como o vídeo engaja nos primeiros 3 segundos(hooks) ? O que adicionar ?
- ** Imagem e Luz **: A fotografia está boa ? Sugira correções de cor(LUTs) ou estabilização.
- ** Texto e Som **: Tem espaço para B - Rolls ou legendas dinâmicas ? Sugira trilhas sonoras.
- ** Mensagem **: Qual o core da fala ou da ação ? Se for o caso, transcreva os pontos altos.
- ** Otimização Cross - Platform **: Como fatiar este material maior para Shorts / Reels / TikTok vs YouTube longo.

## REGRAS ABSOLUTAS:
- Avalie o vídeo sem tentar gerar descrições exaustivas frame a frame; seja prático(ajude o editor).
- Se não houver vídeo anexado, responda sobre estratégias de vídeo textualmente de maneira consultiva.
- Responda sempre em português brasileiro de forma pragmática e assertiva.`;

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
        const { messages: rawMessages, model = "flash", sessionId, libraryMode = false, agent = "thomas", attachments = [] } = await req.json();
        // Strip base64 from historical messages to prevent payload exceeding limits
        // Only the last message (current) should have attachments passed via `attachments` param
        const messages = rawMessages?.map((m: any) => ({
            ...m,
            attachments: m.attachments?.map((a: any) => ({ ...a, base64: undefined })),
        }));


        if (!messages?.length) {
            return Response.json({ error: "Mensagens são obrigatórias" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json(
                { error: "GEMINI_API_KEY não configurada" },
                { status: 500 }
            );
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
            await addChatMessage(currentSessionId, "user", lastMessage.content);
        }

        // ─── Component 3: Library mode — multi-term intelligent search ────────
        let libraryContext = "";
        if (libraryMode && lastMessage.role === "user") {
            try {
                const primaryQuery = lastMessage.content.trim().slice(0, 200);
                const secondaryTerms = extractSearchTerms(lastMessage.content);

                const multiQuery = [primaryQuery, ...secondaryTerms]
                    .filter(Boolean)
                    .join("|");

                const searchUrl = new URL("/api/prompts/search", req.url);
                searchUrl.searchParams.set("q", multiQuery);
                searchUrl.searchParams.set("limit", "10");

                const searchRes = await fetch(searchUrl.toString());

                if (!searchRes.ok) {
                    throw new Error(`Search API returned ${searchRes.status} `);
                }

                const searchData = await searchRes.json();

                if (searchData.results?.length > 0) {
                    const MAX_CONTENT_CHARS = 150;

                    libraryContext = "\n\n--- RESULTADOS DA BUSCA NA BIBLIOTECA ---\n" +
                        searchData.results.map((r: any, i: number) => {
                            const contentPreview = r.content?.length > MAX_CONTENT_CHARS
                                ? r.content.slice(0, MAX_CONTENT_CHARS) + "...[truncated]"
                                : r.content;
                            const mediaStr = r.sourceMedia?.length > 0
                                ? `\nSourceMedia: ${r.sourceMedia.join(", ")} `
                                : "";
                            const scoreStr = r.score !== undefined
                                ? `\nScore: ${r.score.toFixed(3)} `
                                : "";
                            return `\n[${i + 1}]Título: ${r.title} \nDescrição: ${r.description} \nCategoria: ${r.category} \nRequer referência: ${r.needReferenceImages ? "Sim" : "Não"}${scoreStr}${mediaStr} \nPrompt: \n${contentPreview} \n`;
                        }).join("\n---\n");
                } else {
                    libraryContext = "\n\n--- BUSCA NA BIBLIOTECA ---\nNenhum prompt encontrado na biblioteca para essa busca. Gere um prompt customizado e avise que é 🤖 AI-generated, não da biblioteca curada.";
                }
            } catch (err) {
                console.error("Library search error:", err);
                libraryContext = "\n\n[Erro na busca da biblioteca. Gere um prompt customizado e indique que é 🤖 AI-generated.]";
            }
        }

        const ai = new GoogleGenAI({ apiKey });
        // ─── Component: Character Vault Context ──────────────────────────────
        let characterContext = "";
        if (agent === "thomas" && lastMessage.role === "user") {
            try {
                const { getCharacters } = await import("@/lib/db");
                const allChars = await getCharacters();
                const queryTerms = extractSearchTerms(lastMessage.content);
                const matched = allChars.filter((c: any) =>
                    queryTerms.some(term =>
                        c.name.toLowerCase().includes(term) ||
                        (c.description || "").toLowerCase().includes(term)
                    )
                );

                if (matched.length > 0) {
                    characterContext = "\n\n--- PERSONAGENS SALVOS NO VAULT (REFERÊNCIA) ---\n" +
                        matched.map((c: any) => `- ${c.name}: ${c.description || "Sem descrição"}`).join("\n") +
                        "\nInstrução: Se o usuário citou um destes personagens, cite o nome dele no prompt e instrua o usuário a anexar as referências nos Slots.\n\n";
                }
            } catch (err) {
                console.error("Character Vault context injection failed:", err);
            }
        }

        const modelName = MODELS[model as keyof typeof MODELS] || MODELS.flash;

        let systemPrompt = "";
        let systemGreeting = "";

        if (libraryMode) {
            systemPrompt = libraryContext + LIBRARY_SYSTEM_PROMPT + characterContext;
            systemGreeting = "Entendido! Sou seu Especialista em Síntese de Prompts da Biblioteca Nano Banana Pro. Descreva o que precisa e vou buscar, analisar e sintetizar o melhor prompt para você! 📚✨";
        } else if (agent === "aurora") {
            systemPrompt = AURORA_SYSTEM_PROMPT;
            systemGreeting = "Pronto! Sou a Aurora, sua videomaker e head de audiovisual. Mande seu vídeo ou ideia, e vamos roteirizar, decupar ou planejar seu próximo corte viral! 🎬✨";
        } else {
            systemPrompt = characterContext + SYSTEM_PROMPT;
            systemGreeting = "Entendido! Sou seu Arquiteto de Prompts Multimodal. Descreva sua ideia ou envie referências visuais — vou montar o prompt perfeito para o gerador. 🎨";
        }

        const lastUserMsg = messages[messages.length - 1];
        const augmentedMessages = libraryMode && libraryContext
            ? [
                ...messages.slice(0, -1),
                {
                    ...lastUserMsg,
                    content: lastUserMsg.content + libraryContext,
                },
            ]
            : messages;

        const contents: any[] = [
            { role: "user" as const, parts: [{ text: systemPrompt }] },
            { role: "model" as const, parts: [{ text: systemGreeting }] },
        ];

        for (let i = 0; i < augmentedMessages.length; i++) {
            const m = augmentedMessages[i];
            const parts: any[] = [{ text: m.content }];

            if (i === augmentedMessages.length - 1 && m.role === "user" && attachments?.length > 0) {
                const processedAttachments = await Promise.all(attachments.map(async (att: Attachment) => {
                    if (att.fileUri && att.name) {
                        try {
                            // Poll File API Strategy to circumvent Async execution without hanging early
                            let fileState = await ai.files.get({ name: att.name });
                            while (fileState.state === "PROCESSING") {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                fileState = await ai.files.get({ name: att.name });
                            }
                            if (fileState.state === "FAILED") {
                                throw new Error(`O processamento do vídeo ${att.name} falhou na nuvem.`);
                            }
                            return {
                                fileData: {
                                    mimeType: att.type,
                                    fileUri: att.fileUri
                                }
                            };
                        } catch (err) {
                            console.error("Error polling file state:", err);
                            // Fallback gracefully without breaking the chat
                            return null;
                        }
                    } else if (att.base64) {
                        return {
                            inlineData: {
                                mimeType: att.type,
                                data: att.base64
                            }
                        };
                    }
                    return null;
                }));

                const validAttachments = processedAttachments.filter(Boolean);
                if (validAttachments.length > 0) {
                    parts.push(...validAttachments);
                }
            }

            contents.push({
                role: m.role === "assistant" ? "model" as const : "user" as const,
                parts: parts,
            });
        }

        // ─── Streaming response ───────────────────────────────────────────────
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullText = "";

                try {
                    const genStream = await ai.models.generateContentStream({
                        model: modelName,
                        contents,
                    });

                    for await (const chunk of genStream) {
                        // Check if client aborted
                        if (req.signal.aborted) break;

                        const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (chunkText) {
                            fullText += chunkText;
                            const data = JSON.stringify({ text: chunkText }) + "\n";
                            controller.enqueue(encoder.encode(data));
                        }
                    }

                    // Send session ID at the end
                    const done = JSON.stringify({ done: true, sessionId: currentSessionId }) + "\n";
                    controller.enqueue(encoder.encode(done));

                    // Persist assistant message (even if partial from abort)
                    if (currentSessionId && fullText) {
                        const { addChatMessage } = await import("@/lib/db");
                        addChatMessage(currentSessionId, "assistant", fullText);
                    }
                } catch (err: any) {
                    if (!req.signal.aborted) {
                        const status = err?.status || 500;
                        const errorMsg = status === 429
                            ? "Atingimos o limite da API da Inteligência Artificial. Por favor, aguarde alguns instantes."
                            : status === 413
                                ? "O tamanho do anexo excede o limite permitido pela plataforma."
                                : "Ocorreu uma falha inesperada na comunicação com o modelo de IA.";

                        const errData = JSON.stringify({ error: errorMsg, code: status }) + "\n";
                        controller.enqueue(encoder.encode(errData));
                    }
                    // Still persist partial text if we have any
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

    } catch (err: any) {
        console.error("Erro no chat:", err);
        const status = err?.status || 500;
        const errorMsg = status === 429
            ? "Atingimos o limite da API da Inteligência Artificial. Por favor, aguarde alguns instantes."
            : status === 413
                ? "O tamanho da requisição excede o limite permitido."
                : "Erro interno do servidor na comunicação com a API.";

        return Response.json(
            { error: errorMsg, code: status },
            { status }
        );
    }
}
