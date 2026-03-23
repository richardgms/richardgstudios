import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ enhanced: prompt, warning: "No API key configured" });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `Você é um especialista em Engenharia de Prompts (Prompt Engineer). Sua tarefa é refinar e melhorar os prompts do usuário para serem mais eficazes em LLMs (Grandes Modelos de Linguagem). 
Torne o prompt específico, estruturado e claro. 
Retorne APENAS o texto do prompt melhorado. Não adicione explicações.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        return NextResponse.json({ enhanced: response.text || prompt });
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        return NextResponse.json({ enhanced: "" }, { status: 500 });
    }
}
