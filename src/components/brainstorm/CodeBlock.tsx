"use client";

import { memo, useState, lazy, Suspense } from "react";
import { Copy, ArrowRight } from "lucide-react";

const SyntaxHighlighter = lazy(() =>
    import("react-syntax-highlighter/dist/esm/prism-light").then(m => ({ default: m.default }))
);

const vscDarkPlusPromise = import("react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus").then(m => m.default);

interface CodeBlockProps {
    language: string | null;
    code: string;
    onUseInStudio?: (code: string) => void;
}

function CodeBlockInner({ language, code, onUseInStudio }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(null);

    // Load style lazily
    if (!style) {
        vscDarkPlusPromise.then(setStyle);
    }

    const onCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg overflow-hidden border border-border-default bg-[#1e1e1e] my-4 shadow-sm group w-full max-w-full">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-white/5">
                <span className="text-[10px] uppercase font-medium text-gray-400 font-mono">{language || "text"}</span>
                <div className="flex items-center gap-2">
                    {onUseInStudio && (
                        <button
                            onClick={() => onUseInStudio(code)}
                            className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                        >
                            <ArrowRight className="w-3 h-3" />
                            <span>Usar no Studio</span>
                        </button>
                    )}
                    <button
                        onClick={onCopy}
                        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors"
                    >
                        {copied ? (
                            <span className="text-emerald-400 font-medium">Copiado</span>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            <div className="text-sm overflow-hidden">
                <Suspense fallback={
                    <pre className="p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">{code}</pre>
                }>
                    {style ? (
                        <SyntaxHighlighter
                            language={language || "text"}
                            style={style}
                            customStyle={{
                                margin: 0,
                                padding: "1rem",
                                backgroundColor: "transparent",
                                fontSize: "0.875rem",
                                lineHeight: "1.5",
                                whiteSpace: "pre-wrap" as const,
                                wordBreak: "break-word" as const
                            }}
                            wrapLongLines={true}
                        >
                            {code}
                        </SyntaxHighlighter>
                    ) : (
                        <pre className="p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">{code}</pre>
                    )}
                </Suspense>
            </div>
        </div>
    );
}

export const CodeBlock = memo(CodeBlockInner);
