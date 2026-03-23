"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Image as ImageIcon } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

interface MessageRendererProps {
    content: string;
    setViewingImage: (url: string) => void;
    onUseInStudio?: (code: string) => void;
}

function createMarkdownComponents(
    setViewingImage: (url: string) => void,
    onUseInStudio?: (code: string) => void
) {
    return {
        code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
                <CodeBlock
                    language={match[1]}
                    code={String(children).replace(/\n$/, "")}
                    onUseInStudio={onUseInStudio}
                />
            ) : (
                <code className="bg-bg-glass border border-border-default px-1.5 py-0.5 rounded text-xs font-mono text-accent-light break-words whitespace-normal" {...props}>
                    {children}
                </code>
            );
        },
        table({ children }: { children?: React.ReactNode }) {
            return (
                <div className="overflow-x-auto my-4 rounded-lg border border-border-default bg-bg-surface/50">
                    <table className="w-full text-sm text-left">{children}</table>
                </div>
            );
        },
        thead({ children }: { children?: React.ReactNode }) {
            return <thead className="bg-bg-surface-hover text-text-primary font-medium uppercase text-xs tracking-wider">{children}</thead>;
        },
        th({ children }: { children?: React.ReactNode }) {
            return <th className="px-4 py-3 border-b border-border-default font-semibold">{children}</th>;
        },
        td({ children }: { children?: React.ReactNode }) {
            return <td className="px-4 py-3 border-b border-border-default/30 text-text-secondary">{children}</td>;
        },
        ul({ children }: { children?: React.ReactNode }) {
            return <ul className="list-disc pl-5 mb-4 space-y-1 text-text-secondary marker:text-text-muted">{children}</ul>;
        },
        ol({ children }: { children?: React.ReactNode }) {
            return <ol className="list-decimal pl-5 mb-4 space-y-1 text-text-secondary marker:text-text-muted">{children}</ol>;
        },
        li({ children }: { children?: React.ReactNode }) {
            return <li className="pl-1 leading-relaxed">{children}</li>;
        },
        h1({ children }: { children?: React.ReactNode }) {
            return <h1 className="text-xl font-bold mb-4 text-text-primary border-b border-border-default pb-2 mt-6">{children}</h1>;
        },
        h2({ children }: { children?: React.ReactNode }) {
            return <h2 className="text-lg font-bold mb-3 text-text-primary mt-6">{children}</h2>;
        },
        h3({ children }: { children?: React.ReactNode }) {
            return <h3 className="text-md font-semibold mb-2 text-text-primary mt-4">{children}</h3>;
        },
        blockquote({ children }: { children?: React.ReactNode }) {
            return <blockquote className="border-l-4 border-accent/50 pl-4 py-1 my-4 text-text-muted italic bg-accent/5 rounded-r-lg">{children}</blockquote>;
        },
        p({ children }: { children?: React.ReactNode }) {
            return <p className="mb-4 leading-relaxed whitespace-pre-wrap break-words">{children}</p>;
        },
        a({ href, children }: { href?: string; children?: React.ReactNode }) {
            const isImage = href?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || href?.includes('storage/');

            if (isImage) {
                return (
                    <span
                        className="text-accent hover:text-accent-light hover:underline cursor-pointer transition-colors inline-flex items-center gap-1 font-medium"
                        onClick={(e) => {
                            e.preventDefault();
                            if (href) setViewingImage(href);
                        }}
                    >
                        <ImageIcon className="w-3 h-3" />
                        {children}
                    </span>
                );
            }

            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-light hover:underline transition-colors"
                >
                    {children}
                </a>
            );
        }
    };
}

const remarkPlugins = [remarkGfm];

function MessageRendererInner({ content, setViewingImage, onUseInStudio }: MessageRendererProps) {
    const components = useMemo(
        () => createMarkdownComponents(setViewingImage, onUseInStudio),
        [setViewingImage, onUseInStudio]
    );

    return (
        <div className="text-sm w-full font-normal overflow-hidden break-words">
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                components={components as any}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export const MessageRenderer = memo(MessageRendererInner);
