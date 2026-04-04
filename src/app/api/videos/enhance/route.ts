import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `Você é um especialista em prompts de geração de vídeo com IA, treinado nos modelos Veo da Google.
Sua tarefa é transformar a ideia do usuário em um prompt de vídeo rico, cinematográfico e eficaz.

Diretrizes:
- Descreva a cena em detalhes visuais: iluminação, movimento de câmera, atmosfera, cores
- Inclua o estilo cinematográfico quando pertinente (ex: "slow motion", "drone shot", "close-up", "panning shot")
- Mantenha o prompt conciso mas denso: 2-4 frases no máximo
- Preserve a intenção criativa original do usuário
- Escreva em inglês, pois os modelos Veo respondem melhor a prompts em inglês
- Retorne APENAS o prompt melhorado. Nada mais.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: { systemInstruction },
        });

        return NextResponse.json({ enhanced: response.text?.trim() || prompt });
    } catch (error) {
        console.error("[videos/enhance] erro:", error);
        return NextResponse.json({ error: "Erro ao melhorar prompt" }, { status: 500 });
    }
}
