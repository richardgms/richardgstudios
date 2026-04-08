"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Play,
  Download,
  Loader2,
  Upload,
  X,
  Volume2,
  Zap,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

// -------------------------------------------------------------------------
// Tags paralinguísticas suportadas pelo Chatterbox Turbo
// -------------------------------------------------------------------------
const LINGUAL_TAGS = [
  { tag: "[laugh]", label: "Risada", emoji: "😄" },
  { tag: "[chuckle]", label: "Chuckle", emoji: "😏" },
  { tag: "[cough]", label: "Tosse", emoji: "🤧" },
  { tag: "[sigh]", label: "Suspiro", emoji: "😮‍💨" },
  { tag: "[gasp]", label: "Suspense", emoji: "😲" },
  { tag: "[hmm]", label: "Hesitação", emoji: "🤔" },
];

const MAX_CHARS = 2000;

export default function TTSPage() {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Voice cloning
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // -------------------------------------------------------------------------
  // Inserir tag no cursor
  // -------------------------------------------------------------------------
  const insertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + tag + text.slice(end);
    setText(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // -------------------------------------------------------------------------
  // Upload de voz (voice cloning)
  // -------------------------------------------------------------------------
  const handleVoiceFile = useCallback((file: File) => {
    if (!file.type.startsWith("audio/")) {
      setError("Formato inválido. Use um arquivo de áudio (.wav, .mp3, .ogg).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo: 10MB.");
      return;
    }
    setVoiceFile(file);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleVoiceFile(file);
    },
    [handleVoiceFile]
  );

  // -------------------------------------------------------------------------
  // Gerar áudio
  // -------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;
    setError(null);
    setSuccess(false);
    setAudioUrl(null);
    setIsGenerating(true);

    try {
      let audio_prompt_b64: string | undefined;

      if (voiceFile) {
        const bytes = await voiceFile.arrayBuffer();
        const binary = Array.from(new Uint8Array(bytes))
          .map((b) => String.fromCharCode(b))
          .join("");
        audio_prompt_b64 = btoa(binary);
      }

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), audio_prompt_b64 }),
      });

      const data = (await res.json()) as {
        audio_b64?: string;
        sample_rate?: number;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Erro ao gerar áudio.");
      }

      // Decode base64 → Blob → URL
      const byteChars = atob(data.audio_b64!);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArr[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArr], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setSuccess(true);

      // Auto-play
      setTimeout(() => audioRef.current?.play(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `tts-${Date.now()}.wav`;
    a.click();
  };

  const charsLeft = MAX_CHARS - text.length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] px-4 md:px-8 pt-8 pb-16 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl md:text-2xl text-text-primary tracking-tight">
            Text-to-Speech
          </h1>
          <p className="text-xs md:text-sm text-text-muted hidden md:block">
            Powered by Chatterbox Turbo — voice cloning em zero-shot
          </p>
        </div>
      </div>

      {/* Voice Clone Upload */}
      <div className="mb-5">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Voz de referência{" "}
          <span className="text-text-muted/50 normal-case font-normal">(opcional — ~10s de áudio)</span>
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer
            transition-all duration-200
            ${isDragging
              ? "border-accent bg-accent/10"
              : voiceFile
              ? "border-green-500/40 bg-green-500/5"
              : "border-border-default/50 bg-surface-secondary/30 hover:border-accent/50 hover:bg-accent/5"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVoiceFile(f); }}
          />
          {voiceFile ? (
            <>
              <Volume2 className="w-5 h-5 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{voiceFile.name}</p>
                <p className="text-xs text-text-muted">{(voiceFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setVoiceFile(null); }}
                className="p-1 rounded-lg hover:bg-border-default/30 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-text-muted shrink-0" />
              <p className="text-sm text-text-muted">
                Arraste um áudio ou <span className="text-accent">clique para selecionar</span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Texto</p>
          <span className={`text-xs ${charsLeft < 200 ? "text-amber-400" : "text-text-muted/50"}`}>
            {charsLeft} restantes
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Digite o texto que será gerado em áudio... Use tags como [laugh] para expressividade."
          rows={6}
          className="w-full resize-none rounded-xl bg-surface-secondary/50 border border-border-default/50
            text-text-primary placeholder:text-text-muted/40 text-sm p-4
            focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60
            transition-all duration-200"
        />
      </div>

      {/* Tags paralinguísticas */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LINGUAL_TAGS.map(({ tag, label, emoji }) => (
          <button
            key={tag}
            onClick={() => insertTag(tag)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-surface-secondary/60 border border-border-default/40 text-text-muted
              hover:border-accent/50 hover:text-accent hover:bg-accent/5
              transition-all duration-150"
          >
            <span>{emoji}</span>
            <span>{label}</span>
            <code className="text-[10px] opacity-60 font-mono">{tag}</code>
          </button>
        ))}
      </div>

      {/* Botão Gerar */}
      <motion.button
        onClick={handleGenerate}
        disabled={!text.trim() || isGenerating}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl font-semibold text-sm
          bg-accent text-white shadow-lg shadow-accent/30
          disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
          hover:brightness-110 transition-all duration-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando áudio...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Gerar Áudio
          </>
        )}
      </motion.button>

      {/* Info cold start */}
      <p className="text-center text-xs text-text-muted/50 mt-2">
        <Sparkles className="inline w-3 h-3 mr-1" />
        Primeira geração pode levar ~20s (cold start). Próximas em 2–5s.
      </p>

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player de áudio */}
      <AnimatePresence>
        {audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-5 rounded-2xl bg-surface-secondary/60 border border-border-default/40"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-sm font-medium text-text-primary">Áudio gerado com sucesso!</p>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full rounded-lg"
              style={{ accentColor: "var(--color-accent)" }}
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => audioRef.current?.play()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                  bg-accent/15 text-accent border border-accent/30
                  hover:bg-accent/25 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Reproduzir
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                  bg-surface-secondary border border-border-default/50 text-text-muted
                  hover:text-text-primary hover:border-border-default transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar .wav
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sucesso subtil se não tiver áudio ainda */}
      <AnimatePresence>
        {success && !audioUrl && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-sm text-green-400"
          >
            ✓ Áudio pronto!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
