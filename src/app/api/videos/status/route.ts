import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { saveImage } from "@/lib/blob-storage";
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
            operation: Object.assign(new GenerateVideosOperation(), { name: operationId }),
        });

        if (operation.done) {
            console.log(`[videos/status] Video concluído para operacao: ${operationId}`);
            console.log(`[videos/status] Operation object:`, JSON.stringify(operation, null, 2));

            // It could be completed with an error
            const errorObj = operation.error; // Checking native typed error if exists
            if (errorObj) {
                console.error(`[videos/status] API retornou erro em runtime assíncrono:`, errorObj);
                await updateGeneration(genId, { status: "failed" });
                return NextResponse.json({
                    status: "failed",
                    message: "A geração falhou remotamente",
                    details: errorObj
                });
            }

            // Successfully finished: Download the video
            // The object might be formatted by the SDK wrapper OR raw from our _fromAPIResponse bypass
            const rawResponse = operation.response;
            console.log(`[videos/status] operation.response exists:`, !!rawResponse);
            console.log(`[videos/status] operation.response:`, JSON.stringify(rawResponse, null, 2));

            console.log("[videos/status] Raw response structure:", JSON.stringify(rawResponse, null, 2));
            console.log("[videos/status] Response keys:", Object.keys(rawResponse || {}));

            // Try SDK format first: operation.response.generatedVideos[0].video
            let generatedVideo = rawResponse?.generatedVideos?.[0];
            if (generatedVideo) {
                console.log("[videos/status] Found SDK format: generatedVideos");
            }

            // Fallback to REST API format: operation.response.generateVideoResponse.generatedSamples[0]
            // Cast to any since this is a fallback for different API response formats
            if (!generatedVideo) {
                generatedVideo = (rawResponse as any)?.generateVideoResponse?.generatedSamples?.[0];
                if (generatedVideo) {
                    console.log("[videos/status] Found REST format: generateVideoResponse");
                }
            }

            // Additional fallback: check for direct generatedSamples (some API versions)
            if (!generatedVideo) {
                generatedVideo = (rawResponse as any)?.generatedSamples?.[0];
                if (generatedVideo) {
                    console.log("[videos/status] Found alternate format: generatedSamples");
                }
            }

            if (!generatedVideo?.video) {
                console.error("[videos/status] ================= FATAL ERROR ================= ");
                console.error("[videos/status] Video attribute missing. Raw operation payload:");
                console.error(JSON.stringify(operation, null, 2));
                console.error("[videos/status] Attempted paths:");
                console.error(`  - generatedVideos[0].video: ${rawResponse?.generatedVideos?.[0]?.video ? 'EXISTS' : 'MISSING'}`);
                console.error(`  - generateVideoResponse.generatedSamples[0].video: ${(rawResponse as any)?.generateVideoResponse?.generatedSamples?.[0]?.video ? 'EXISTS' : 'MISSING'}`);
                console.error(`  - generatedSamples[0].video: ${(rawResponse as any)?.generatedSamples?.[0]?.video ? 'EXISTS' : 'MISSING'}`);
                console.error("================================================================ ");
                await updateGeneration(genId, { status: "failed" });
                return NextResponse.json({
                    status: "failed",
                    error: "Vídeo não encontrado na resposta concluída. Revise a documentação em docs/ai.google.dev/gemini-api/docs/veo.md",
                    details: operation
                }, { status: 500 });
            }

            const folder = projectId || "_unsorted";
            const fileName = `${folder}/${genId}.mp4`;
            let buffer: Buffer;

            console.log(`[videos/status] Processando arquivo gerado...`);
            const vidObj = generatedVideo.video;

            if (vidObj.videoBytes) {
                // If the bytes are sent directly inline via the API format
                console.log(`[videos/status] Extracting inline videoBytes...`);
                buffer = Buffer.from(vidObj.videoBytes, "base64");
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
                buffer = Buffer.from(arrayBuf);
            } else {
                throw new Error("Resposta da geracao nao contem videoBytes ou uri valido.");
            }

            const publicPath = await saveImage(fileName, buffer);

            await updateGeneration(genId, {
                status: "completed",
                imagePath: publicPath,
            });

            return NextResponse.json({
                status: "completed",
                imagePath: publicPath,
                imageUrl: publicPath.startsWith('http') ? publicPath : `/api/images/${fileName}`,
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
            // await updateGeneration(genId, { status: "failed" });
        }

        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Erro interno", status: "error_endpoint" },
            { status: 500 }
        );
    }
}
