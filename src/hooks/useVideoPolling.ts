import { useState, useCallback, useRef, useEffect } from "react";

export type VideoGenStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface PollingState {
    status: VideoGenStatus;
    imageUrl?: string;
    error?: string;
    operationId?: string;
    generationId?: string;
}

export function useVideoPolling() {
    const [state, setState] = useState<PollingState>({ status: 'idle' });
    const abortControllerRef = useRef<AbortController | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Limpeza no unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            abortControllerRef.current?.abort();
        };
    }, []);

    const startPolling = useCallback(async (
        prompt: string,
        model: string,
        aspectRatio: string,
        projectId?: string,
        sessionId?: string,
        attachments?: any[]
    ) => {
        setState({ status: 'processing', error: undefined });

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        try {
            // Iniciar Geração
            const generateRes = await fetch("/api/videos/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model, aspectRatio, projectId, sessionId, attachments }),
                signal: abortControllerRef.current.signal
            });

            const data = await generateRes.json();

            if (!generateRes.ok) {
                throw new Error(data.error || "Falha ao iniciar geração de vídeo");
            }

            const { operationId, id: generationId } = data;
            setState({ status: 'processing', operationId, generationId });

            // Iniciar loop de polling
            const poll = async () => {
                if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;

                try {
                    const statusRes = await fetch("/api/videos/status", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ operationId, id: generationId, projectId }),
                        signal: abortControllerRef.current?.signal // might be aborted during fetch
                    });

                    const statusData = await statusRes.json();

                    if (!statusRes.ok) {
                        throw new Error(statusData.error || "Falha ao verificar status");
                    }

                    if (statusData.status === 'completed') {
                        setState({ status: 'completed', imageUrl: statusData.imageUrl, generationId });
                        return; // fim!
                    } else if (statusData.status === 'failed') {
                        throw new Error(statusData.message || statusData.error || "Processo falhou remotamente");
                    }

                    // Se ainda não concluiu, espera 10s e tenta de novo (conforme plan: mínimo 10.000ms)
                    timeoutRef.current = setTimeout(poll, 10000);

                } catch (err: any) {
                    if (err.name === 'AbortError') return;
                    setState({ status: 'failed', error: err.message, generationId });
                }
            };

            // Esperar o primeiro polling 10s para não spammar
            timeoutRef.current = setTimeout(poll, 10000);

        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setState({ status: 'failed', error: err.message });
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        abortControllerRef.current?.abort();
        setState(prev => ({ ...prev, status: 'idle' })); // Reseta status ou mantém o failed? Vamos para idle.
    }, []);

    const resetState = useCallback(() => {
        stopPolling();
        setState({ status: 'idle' });
    }, [stopPolling]);

    return {
        ...state,
        startPolling,
        stopPolling,
        resetState
    };
}
