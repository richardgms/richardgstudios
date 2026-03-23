"use server";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export async function sendMessageAction(messages: { role: string; content: string }[]) {
  try {
    const lastMessage = messages[messages.length - 1].content;
    
    // Prepare history for GoogleGenAI
    // The new SDK expects contents as part of the generateContent call or via chat
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
    });

    const text = response.text;

    return { success: true, text };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { success: false, error: error.message };
  }
}
