import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { updateGeneration } from "@/lib/db";

// ============================================================
// STATUS POLLING HANDLER
// Checks the video generation operation status and downloads the result when done.
// ============================================================
export async function POST(req: NextRequest) {
    let operationId: string | undefined;
    let genId: string | undefined;
    let projectId: string | undefined;

    try {
        const body = await req.json();
        operationId = body.operationId;
        genId = body.id;
        projectId = body.projectId;

        if (!operationId || !genId) {
            return NextResponse.json({ error: "operationId e id são obrigatórios" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        console.log(`[videos/status] Verificando operacao: ${operationId}`);
        const operation = await ai.operations.getVideosOperation({
            operation: {
                name: operationId,
                // The @google/genai SDK expects an instantiated class that has this method to wrap responses.
                // We provide a duck-typed mock that just passes through the raw JSON response seamlessly.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                _fromAPIResponse: (params: any) => params.apiResponse
            } as any
        });

        if (operation.done) {
            console.log(`[videos/status] Video concluído para operacao: ${operationId}`);

            // It could be completed with an error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorObj = (operation as any).error; // Checking native typed error if exists
            if (errorObj) {
                console.error(`[videos/status] API retornou erro em runtime assíncrono:`, errorObj);
                updateGeneration(genId, { status: "failed" });
                return NextResponse.json({
                    status: "failed",
                    message: "A geração falhou remotamente",
                    details: errorObj
                });
            }

            // Successfully finished: Download the video
            // The object might be formatted by the SDK wrapper OR raw from our _fromAPIResponse bypass
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawResponse = operation.response as any;
            const generatedVideo = rawResponse?.generatedVideos?.[0] ||
                rawResponse?.generateVideoResponse?.generatedSamples?.[0];

            if (!generatedVideo?.video) {
                console.error("[videos/status] ================= FATAL ERROR ================= ");
                console.error("[videos/status] Video attribute missing. Raw operation payload:");
                console.error(JSON.stringify(operation, null, 2));
                console.error("================================================================ ");
                updateGeneration(genId, { status: "failed" });
                return NextResponse.json({
                    status: "failed",
                    error: "Vídeo não encontrado na resposta concluída",
                    details: operation
                }, { status: 500 });
            }

            const folder = projectId || "_unsorted";
            const dir = path.join(process.cwd(), "storage", folder);
            fs.mkdirSync(dir, { recursive: true });

            const fileName = `${genId}.mp4`;
            const destPath = path.join(dir, fileName);

            console.log(`[videos/status] Baixando arquivo gerado para ${destPath}`);
            const vidObj = generatedVideo.video;

            if (vidObj.videoBytes) {
                // If the bytes are sent directly inline via the API format
                console.log(`[videos/status] Extracting inline videoBytes...`);
                fs.writeFileSync(destPath, Buffer.from(vidObj.videoBytes, "base64"));
            } else if (vidObj.uri) {
                // The uri is a full https endpoint, e.g. "https://generativelanguage.googleapis.com/..."
                console.log(`[videos/status] Downloading from URI manually: ${vidObj.uri}`);
                const fileRes = await fetch(vidObj.uri, {
                    headers: {
                        "x-goog-api-key": apiKey
                    }
                });

                if (!fileRes.ok) {
                    throw new Error(`Falha ao baixar video da URI: ${fileRes.statusText}`);
                }

                const arrayBuf = await fileRes.arrayBuffer();
                fs.writeFileSync(destPath, Buffer.from(arrayBuf));
            } else {
                throw new Error("Resposta da geracao nao contem videoBytes ou uri valido.");
            }

            const publicPath = `storage/${folder}/${fileName}`;

            updateGeneration(genId, {
                status: "completed",
                imagePath: publicPath,
            });

            return NextResponse.json({
                status: "completed",
                imagePath: publicPath,
                imageUrl: `/api/images/${folder}/${fileName}`,
            });
        } else {
            console.log(`[videos/status] Operacao ainda rodando: ${operationId} - Status: Processing`);
            return NextResponse.json({
                status: "processing",
                message: "O vídeo está sendo gerado e ainda não tem resultados"
            });
        }

    } catch (err) {
        console.error("[videos/status] Erro inesperado:", err);

        // Apenas atualizar o banco se tivéssemos os IDs, e for um erro persistente que falha o request no backend
        if (genId) {
            // Em cenários instáveis, pode ser timeout da edge/API. Não estripar imediatamente a UI.
            // updateGeneration(genId, { status: "failed" });
        }

        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Erro interno", status: "error_endpoint" },
            { status: 500 }
        );
    }
}
