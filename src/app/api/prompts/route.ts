import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Fuse from "fuse.js";
import { CATEGORIES, type Prompt, type PromptWithMeta } from "@/lib/prompts";

// Cache em memória para evitar reler JSONs a cada request
const cache: Record<string, Prompt[]> = {};

function loadCategory(categoryId: string): Prompt[] {
    if (cache[categoryId]) return cache[categoryId];

    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return [];

    const filePath = path.join(process.cwd(), "src", "data", cat.file);
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        cache[categoryId] = data;
        return data;
    } catch {
        return [];
    }
}

function loadAllPrompts(): PromptWithMeta[] {
    const all: PromptWithMeta[] = [];
    for (const cat of CATEGORIES) {
        const prompts = loadCategory(cat.id);
        prompts.forEach((p, index) => {
            all.push({ ...p, category: cat.id, index });
        });
    }
    return all;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "60");
    const offset = parseInt(searchParams.get("offset") || "0");

    let prompts: PromptWithMeta[];

    if (category) {
        const catPrompts = loadCategory(category);
        prompts = catPrompts.map((p, index) => ({
            ...p,
            category,
            index,
        }));
    } else {
        prompts = loadAllPrompts();
    }

    // Busca fuzzy
    if (query && query.trim()) {
        const fuse = new Fuse(prompts, {
            keys: ["title", "description", "content"],
            threshold: 0.4,
            includeScore: true,
        });
        const results = fuse.search(query);
        prompts = results.map((r) => r.item);
    }

    const total = prompts.length;
    const paginated = prompts.slice(offset, offset + limit);

    return NextResponse.json({
        prompts: paginated,
        total,
        limit,
        offset,
    });
}
