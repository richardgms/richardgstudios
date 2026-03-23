"use client";

import { Search, X } from "lucide-react";
import { useState, useCallback } from "react";

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Buscar prompts..." }: SearchBarProps) {
    const [value, setValue] = useState("");

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            setValue(v);
            onSearch(v);
        },
        [onSearch]
    );

    const handleClear = useCallback(() => {
        setValue("");
        onSearch("");
    }, [onSearch]);

    return (
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full pl-11 pr-10 py-3 bg-bg-glass border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-accent/30 transition-all"
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-bg-surface-hover transition-colors"
                >
                    <X className="w-3.5 h-3.5 text-text-muted" />
                </button>
            )}
        </div>
    );
}
