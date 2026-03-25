"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Option {
    value: string | number;
    label: string;
    disabled?: boolean;
}

interface UISelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: Option[];
    className?: string;
    disabled?: boolean;
    activeClass?: string; // ex: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    icon?: React.ReactNode;
    labelClassName?: string;
    /** Modo ícone compacto: exibe apenas o ícone, sem label e sem chevron */
    compact?: boolean;
}

export function UISelect({ value, onChange, options, className = "", disabled, activeClass, icon, labelClassName, compact }: UISelectProps) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);

    const updateCoords = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({ top: rect.top, left: rect.left, width: rect.width });
    };

    const handleOpen = () => {
        updateCoords();
        setOpen((v) => !v);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${compact ? "flex-1" : "shrink-0"} ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleOpen}
                className={`${
                    compact
                        ? "w-full flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed"
                        : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border disabled:opacity-40 disabled:cursor-not-allowed"
                } ${
                    activeClass
                        ? activeClass
                        : open
                            ? "bg-bg-glass-hover border-accent/50 text-text-primary"
                            : "bg-bg-glass border-border-default text-text-muted hover:text-text-primary hover:border-border-hover"
                }`}
            >
                {compact ? (
                    <>
                        {icon && <span className="shrink-0">{icon}</span>}
                        <span className="text-[9px] font-semibold leading-none opacity-80 max-w-full px-0.5 truncate">
                            {selected?.label ?? "—"}
                        </span>
                    </>
                ) : (
                    <>
                        {icon && <span className="shrink-0">{icon}</span>}
                        <span className={labelClassName}>{selected?.label ?? "—"}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                    </>
                )}
            </button>

            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {open && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            style={{
                                position: "fixed",
                                bottom: `calc(100vh - ${coords.top}px + 8px)`,
                                left: coords.left,
                                minWidth: coords.width,
                                zIndex: 9999,
                            }}
                            className="bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden"
                        >
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={opt.disabled}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap ${
                                        opt.value === value
                                            ? activeClass ?? "text-accent bg-accent/10"
                                            : "text-text-secondary hover:text-text-primary hover:bg-bg-glass-hover"
                                    }`}
                                >
                                    {opt.label}
                                    {opt.value === value && <Check className="w-3 h-3 shrink-0" />}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
