import { NextRequest, NextResponse } from "next/server";

// Rate limiting in-memory simples (limita por IP em instâncias serverless)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;

const MODAL_TTS_URL = process.env.MODAL_TTS_URL;

export async function POST(req: NextRequest) {
  // 1. Rate Limiting Protection
  const ip = req.headers.get("x-forwarded-for") ?? "unknown-ip";
  const now = Date.now();
  
  // Limpa o map esporadicamente para evitar memory leak em instâncias quentes
  if (rateLimitMap.size > 5000) rateLimitMap.clear();

  const rlData = rateLimitMap.get(ip);
  if (rlData && rlData.resetTime > now) {
    if (rlData.count >= MAX_REQUESTS_PER_MINUTE) {
      const waitSeconds = Math.ceil((rlData.resetTime - now) / 1000);
      return NextResponse.json(
        { error: `Limite de geração atingido. Tente novamente em ${waitSeconds}s.` },
        { status: 429, headers: { "Retry-After": waitSeconds.toString() } }
      );
    }
    rlData.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60_000 });
  }

  if (!MODAL_TTS_URL) {
    return NextResponse.json(
      { error: "TTS service não configurado. Defina MODAL_TTS_URL no .env." },
      { status: 503 }
    );
  }

  // 2. Base64 Payload Warning
  // NOTA ARQUITETURAL: O Vercel limita o tamanho do body da request a 4.5MB.
  // Para arquivos de áudio muito grandes (voice cloning), este body pode estourar esse limite.
  // No futuro (v2), o áudio deverá ser enviado para um Blob (S3/Vercel Blob),
  // e apenas uma Signed URL será enviada ao Modal.
  let body: { text?: string; audio_prompt_b64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { text, audio_prompt_b64 } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Campo 'text' é obrigatório." },
      { status: 400 }
    );
  }

  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Texto muito longo. Máximo: 2000 caracteres." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(MODAL_TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), audio_prompt_b64 }),
      signal: AbortSignal.timeout(90_000), // 90s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS] Erro do Modal:", errorText);
      return NextResponse.json(
        { error: "Erro ao gerar áudio." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      audio_b64?: string;
      sample_rate?: number;
      error?: string;
    };

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({
      audio_b64: data.audio_b64,
      sample_rate: data.sample_rate ?? 24000,
    });
  } catch (err) {
    console.error("[TTS] Timeout ou erro de rede:", err);
    return NextResponse.json(
      { error: "Serviço de TTS indisponível ou timeout." },
      { status: 504 }
    );
  }
}
