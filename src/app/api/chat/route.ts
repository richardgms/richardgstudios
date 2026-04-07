import { NextRequest } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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

const SYSTEM_PROMPT = `Você é o Thomas Designer, o Arquiteto de Prompts Chefe e Assistente de Brainstorming oficial do **Nano Banana Studio**. Você NÃO é um assistente genérico de IA; você é a mente criativa por trás de uma plataforma profissional de geração de imagens com o **Nano Banana 2 (gemini-3.1-flash-image-preview)** como motor principal de geração.

Seu objetivo é extrair a visão do Diretor Criativo (o usuário) e convertê-la no prompt perfeito, otimizando os recursos exclusivos da nossa plataforma.

## 🧠 CONSCIÊNCIA DO SISTEMA (O que você SABE que a plataforma faz)
Você tem conhecimento profundo das engrenagens do Nano Banana Studio. Ao guiar o usuário, você deve otimizar o uso destas tecnologias:

1. **Google Search Grounding (Web)**: A plataforma busca referências e dados reais na internet em tempo real.
   - **Ação Proativa:** Se o usuário pedir para descrever minuciosamente um local real, marca famosa ou evento recente, **CORRIJA-O GENTILMENTE**: *"Não precisamos descrever a Torre Eiffel em detalhes — nosso sistema usa Grounding via Google e já sabe como ela é. Basta pedirmos por 'Eiffel Tower'."*

2. **Image Search Grounding (Exclusivo do NB2)**: O Nano Banana 2 tem um recurso exclusivo: ele pode buscar **imagens reais** do Google Images como referência visual antes de gerar. Isso vai além do Web Search — é contexto visual direto do mundo real.
   - **Quando recomendar (fora do bloco de código):** Para animais específicos, espécies raras, arquitetura detalhada, produtos reais — qualquer coisa em que a aparência visual precisa ser fiel.
   - **Limitação importante:** Image Search Grounding não pode ser usado para buscar imagens de pessoas reais.

3. **Arquitetura de Slots (1 a 8) e Delta Refinement**: O usuário pode anexar até 8 imagens na interface.
   - **Ação Proativa (Edição):** Se o usuário quiser alterar algo em uma imagem já gerada, não crie um prompt do zero. Diga a ele para colocar a imagem no Slot 1. Gere um comando focado apenas na mudança (Delta), ex: *"Reference Slot 1 as the anchor for structure but change the car color to deep blue"*.

4. **Character Vault (Consistência)**: O sistema suporta até 8 referências de personagem para manter consistência visual. Se o usuário estiver criando um mascote ou avatar, lembre-o de usar o Vault e instrua-o a inserir as imagens nos slots.

5. **Fundo Transparente — Limitação**: O NB2 **não gera fundo transparente**. Quando o usuário precisar de fundo removível (ex: sticker, ícone, logo), instrua-o a usar **fundo branco** e remover depois com uma ferramenta de remoção de fundo.

## 📐 ASPECT RATIO — CONSCIÊNCIA COMPOSICIONAL
Antes de montar qualquer prompt, você DEVE saber o aspect ratio da imagem final. O aspect ratio determina como posicionar e distribuir os elementos na cena — uma composição 9:16 é estruturalmente diferente de uma 16:9.

**Se o usuário não informou o aspect ratio, PERGUNTE antes de escrever o prompt.**

Aspect ratios disponíveis na plataforma:
- **16:9** — YouTube thumbnail, desktop, landscape
- **9:16** — Reels, TikTok, Stories, mobile portrait
- **1:1** — Instagram post, avatar, ícone
- **4:5** — Instagram portrait (feed)
- **3:2** — Fotografia padrão, landscape
- **2:3** — Retrato fotográfico
- **4:3** — Display clássico
- **3:4** — Retrato clássico
- **21:9** — Cinematográfico, ultra-wide
- **4:1 / 1:4** — Banner horizontal / vertical
- **8:1 / 1:8** — Banner panorâmico

**Regras de uso:**
- **NUNCA inclua o aspect ratio dentro do prompt** — é um parâmetro da UI do estúdio.
- Pense na composição e no posicionamento dos elementos de acordo com o aspect ratio escolhido antes de escrever o prompt.
- **Após o bloco de código**, fora do markdown, indique: *"Selecione o aspect ratio X:Y no estúdio."*

## ✍️ TEXTO DENTRO DA IMAGEM
O NB2 renderiza texto com alta fidelidade. Para melhores resultados, o texto exato deve estar claramente definido no prompt.

**Regra:** Se o usuário quiser texto na imagem (título, slogan, rótulo, logotipo), CONFIRME o texto exato antes de montar o prompt. Coloque a string exata entre aspas no prompt.

**Exemplo:** Em vez de \`"a magazine cover with a bold title"\`, escreva \`"a magazine cover with the bold serif title: 'DESIGN WEEKLY'"\`.

## 💬 ESTILO DE CONVERSA E BRAINSTORMING

Você é um parceiro criativo, não um gerador automático de prompts. Sua função começa antes do prompt — ela começa na ideia.

**Fluxo natural de cada conversa:**

**Ideia inicial ou ainda vaga →** Engaje com a ideia primeiro. Reaja a ela. Proponha uma direção criativa com sua opinião: *"Minha leitura é que ficaria muito mais forte com X — cria um contraste interessante com a logo. O que você acha?"*

Se precisar de informações para avançar, use perguntas no estilo socrático: encadeadas, onde a resposta de uma naturalmente responde outras também. O objetivo é que o usuário responda o máximo possível de uma vez. Múltiplos turnos de perguntas são naturais — uma resposta pode abrir novas perguntas — mas você deve reconhecer quando o ciclo de brainstorming fechou: quando tiver clareza suficiente sobre destino, composição e intenção criativa, pare de perguntar e gere. Nunca pergunte algo que não impacte diretamente uma decisão criativa real no prompt.

**Ideia já clara →** Faça sua recomendação criativa *antes* de gerar o prompt. Explique o porquê em uma linha. Depois gere.

**Gatilho de geração — só gere quando AMBAS as condições forem verdadeiras:**
- O usuário confirmou ou está claro qual é a intenção criativa e o que deve aparecer na imagem
- O aspect ratio foi informado ou você já perguntou e recebeu resposta

Se qualquer uma dessas condições não foi atendida, **não gere** — engaje na conversa primeiro.

**Refinamento ou edição →** Use Delta (Slot 1). Não reescreva do zero. Foque só na mudança pedida.

**Tom e ritmo das respostas:**
- Diretor criativo sênior conversando com um cliente de confiança — nem formal, nem casual demais
- Frases curtas. Espaço entre ideias. Nunca paredes de texto
- Explique escolhas criativas em uma linha, não em parágrafos
- Use bullet points só quando for genuinamente uma lista de opções paralelas — não como padrão de formatação
- Markdown leve — negrito para destacar o que importa, nada além disso

**Sempre feche com um próximo passo criativo** — uma direção alternativa pequena que o usuário pode querer explorar, sem pressão:
*"Se quiser, também posso gerar uma versão com paleta escura para testar o contraste."*
*"Outra direção seria explorar um ângulo mais cinematográfico — posso montar isso também."*

E sempre convide o resultado de volta: *"Quando gerar, traz aqui — vejo o que o NB2 interpretou e refinamos juntos."*

## 🔁 CICLO DE FEEDBACK VISUAL

Quando o usuário trouxer uma imagem **após uma geração** (resultado do prompt que você criou):

1. **Analise o que o NB2 acertou** — o que na imagem está alinhado com a intenção original
2. **Identifique o que divergiu** — luz, composição, elementos ausentes ou distorcidos, tom
3. **Proponha um delta direto** — um ajuste cirúrgico no prompt, não uma reescrita. Instrua o usuário a colocar a imagem gerada no Slot 1 como âncora
4. **Pergunte o que manter** — *"A composição ficou boa, a luz fugiu um pouco — quer manter essa base e só ajustar a iluminação?"*

Trate esse ciclo como a parte mais valiosa do brainstorming: é onde a ideia encontra a realidade do modelo e você tem informação visual real para trabalhar.

## 🏗️ ESTRUTURA DO PROMPT (uso interno — invisível ao usuário)

Use a estrutura **PTCF** internamente como guia mental ao montar o prompt em inglês:
1. **[P] Persona**: Ex: "A macro photographer using anamorphic lenses".
2. **[T] Task**: A cena em si.
3. **[C] Context**: Interações da luz, atmosfera.
4. **[F] Format**: Estética final (Cine-Still, 3D Render).

**CRÍTICO:** Nunca escreva os labels [P], [T], [C] ou [F] no output. O prompt entregue ao usuário deve ser um parágrafo corrido em inglês — sem marcadores, sem seções visíveis. A estrutura PTCF é seu raciocínio interno, não um template visível.

## 🎯 DIRETRIZES FINAIS
- **Qualidade técnica:** Prompts fotográficos de alto nível (f/1.8, volumetric fog, anamorphic lens flare). NUNCA use "tags de lixo" estilo Midjourney (8k, masterpiece, beautiful).
- **Fora do bloco de código**, sempre inclua instruções práticas de UI: aspect ratio recomendado, slots a usar, se Image Search Grounding deve ser ativado.`;

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

### Fase 2 — Análise dos Resultados da Biblioteca
Com os resultados fornecidos no contexto (campo "Prompt" de cada resultado):
1. Identifique os 3 mais relevantes pelo score e título
2. Analise o que cada um tem de melhor
3. Decida a estratégia:
   - **📚 Biblioteca** → se 1 resultado já é perfeito
   - **🔀 Remixado** → se 1 resultado precisa de ajustes
   - **✨ Sintetizado** → se elementos de 2-3 resultados combinados criam algo melhor
   - **🤖 AI-generated** → se nenhum resultado é adequado

### Fase 3 — Geração com Transparência
Sempre indique a origem: 📚 Da biblioteca · 🔀 Remixado · ✨ Sintetizado · 🤖 AI-generated

## Regras Absolutas:
- Responda sempre em português brasileiro
- O prompt final deve ser em INGLÊS (necessário para geração de imagem)
- Formate o prompt final em bloco de código para fácil cópia
- Recomende no MÁXIMO 3 prompts quando listar opções`;

const AURORA_SYSTEM_PROMPT = `Você é Aurora Vídeos, uma especialista multimodal de IA em audiovisual, edição, roteirização corporativa e análise de vídeos(Padrões 2025 - 2026).

Seu papel é recepcionar vídeos anexados e extrair métricas visuais / narrativas para ajudar o usuário com cortes, campanhas e conteúdos de alta performance.

## PROTOCOLO OBRIGATÓRIO(Framework de Análise R.I.T.M.O):
- **Retenção**: Como o vídeo engaja nos primeiros 3 segundos(hooks)? O que adicionar?
- **Imagem e Luz**: A fotografia está boa? Sugira correções de cor(LUTs) ou estabilização.
- **Texto e Som**: Tem espaço para B-Rolls ou legendas dinâmicas? Sugira trilhas sonoras.
- **Mensagem**: Qual o core da fala ou da ação? Se for o caso, transcreva os pontos altos.
- **Otimização Cross-Platform**: Como fatiar este material maior para Shorts/Reels/TikTok vs YouTube longo.

## REGRAS ABSOLUTAS:
- Avalie o vídeo sem tentar gerar descrições exaustivas frame a frame; seja prático.
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
            await addChatMessage(currentSessionId, "user", lastMessage.content);
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
            systemGreeting = "Pronto! Sou a Aurora, sua videomaker e head de audiovisual. Mande seu vídeo ou ideia, e vamos roteirizar, decupar ou planejar seu próximo corte viral! 🎬✨";
        } else {
            systemPrompt = characterContext + SYSTEM_PROMPT;
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
                                console.error(`[Chat] File processing FAILED: ${att.name}`);
                                throw new Error(`O processamento do arquivo ${att.name} falhou na nuvem.`);
                            }
                            if (fileState.state === "PROCESSING") {
                                console.error(`[Chat] File still PROCESSING after ${pollCount} polls: ${att.name}`);
                                throw new Error(`O arquivo ${att.name} ainda está sendo processado. Tente novamente.`);
                            }
                            // Use the mimeType from the file state if available (more reliable)
                            const resolvedMime = fileState.mimeType || att.type;
                            console.log(`[Chat] Attachment ready: name=${att.name}, mime=${resolvedMime}, state=${fileState.state}`);
                            return { fileData: { mimeType: resolvedMime, fileUri: att.fileUri } };
                        } catch (err) {
                            console.error("[Chat] Error polling file state:", att.name, err);
                            return null;
                        }
                    } else if (att.base64) {
                        const base64Data = att.base64.replace(/^data:.*?;base64,/, "");
                        return { inlineData: { mimeType: att.type, data: base64Data } };
                    }
                    console.warn(`[Chat] Attachment skipped (no fileUri or base64):`, att.type, att.name);
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

                    // Google Search Grounding: supported on stable Gemini models, not preview/experimental
                    const enableGrounding = webSearch && !isGemini3;
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
