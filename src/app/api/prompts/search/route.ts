import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Fuse from "fuse.js";
import { CATEGORIES, type Prompt } from "@/lib/prompts";

// ─── In-memory cache (avoids re-reading JSON files on every request) ─────────
const cache: Record<string, Prompt[]> = {};

function loadCategory(categoryId: string): Prompt[] {
    if (cache[categoryId]) return cache[categoryId];
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return [];
    const filePath = path.join(process.cwd(), "src", "data", cat.file);
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        cache[categoryId] = JSON.parse(raw);
        return cache[categoryId];
    } catch {
        return [];
    }
}

interface SearchResult {
    title: string;
    description: string;
    content: string;
    category: string;
    index: number;
    sourceMedia: string[];
    needReferenceImages: boolean;
    score?: number;
}

/**
 * GET /api/prompts/search?q=<keywords>&category=<cat>&limit=10
 *
 * Supports multi-term queries via pipe separator: q=avatar|anime|cyberpunk
 * Returns deduplicated results with diversity across categories.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get("q") || "";
    const categoryFilter = searchParams.get("category") || "";
    // Increased limit cap from 10 → 20 to give the AI more context
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    if (!rawQ.trim()) {
        return NextResponse.json({ results: [], total: 0 });
    }

    // ─── Multi-term support: split by pipe, cap at 4 terms ───────────────────
    const terms = rawQ.includes("|")
        ? rawQ.split("|").map((t) => t.trim()).filter(Boolean).slice(0, 4)
        : [rawQ.trim()];

    // ─── Determine which categories to search ────────────────────────────────
    const categoriesToSearch = categoryFilter
        ? CATEGORIES.filter((c) => c.id === categoryFilter)
        : CATEGORIES;

    // ─── Build searchable pool ────────────────────────────────────────────────
    const searchPool: SearchResult[] = [];
    for (const cat of categoriesToSearch) {
        const prompts = loadCategory(cat.id);
        prompts.forEach((p, index) => {
            searchPool.push({
                title: p.title,
                description: p.description,
                content: p.content,
                category: cat.id,
                index,
                sourceMedia: p.sourceMedia,
                needReferenceImages: p.needReferenceImages,
            });
        });
    }

    // ─── Fuse.js config (threshold 0.5 = slightly more permissive than 0.45) ─
    const fuseOptions = {
        keys: [
            { name: "title", weight: 0.4 },
            { name: "description", weight: 0.3 },
            { name: "content", weight: 0.3 },
        ],
        threshold: 0.5,
        includeScore: true,
    };

    // ─── Search each term, merge with deduplication ───────────────────────────
    // Key: `${title}::${category}` ensures no duplicate prompt appears twice
    const seen = new Set<string>();
    const allResults: SearchResult[] = [];

    for (const term of terms) {
        if (!term) continue;
        const fuse = new Fuse(searchPool, fuseOptions);
        const termResults = fuse.search(term);

        for (const r of termResults) {
            const key = `${r.item.title}::${r.item.category}`;
            if (!seen.has(key)) {
                seen.add(key);
                allResults.push({ ...r.item, score: r.score });
            }
        }
    }

    // ─── Sort by score (lower = more relevant in Fuse.js) ────────────────────
    allResults.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

    // ─── Diversity pass: ensure results span multiple categories ─────────────
    // First pass: take the best result from each unique category
    const diversified: SearchResult[] = [];
    const categorySeen = new Set<string>();

    for (const r of allResults) {
        if (!categorySeen.has(r.category)) {
            categorySeen.add(r.category);
            diversified.push(r);
        }
    }

    // Second pass: fill remaining slots with best remaining results
    for (const r of allResults) {
        if (diversified.length >= limit) break;
        if (!diversified.includes(r)) {
            diversified.push(r);
        }
    }

    // ─── Format and return ────────────────────────────────────────────────────
    const results = diversified.slice(0, limit).map((r) => ({
        title: r.title,
        description: r.description,
        content: r.content,
        category: r.category,
        index: r.index,
        sourceMedia: r.sourceMedia?.slice(0, 2) || [],
        needReferenceImages: r.needReferenceImages,
        score: r.score,
    }));

    return NextResponse.json({ results, total: results.length });
}
