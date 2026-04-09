import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import { CATEGORIES, type Prompt, type PromptWithMeta } from "@/lib/prompts";

// Importações estáticas dos JSONs para garantir que sejam incluídos no bundle de produção
// Usando caminhos relativos para evitar ambiguidades com aliases no build do Turbopack/Vercel
import profileAvatar from "../../../../data/profile-avatar.json";
import socialMediaPost from "../../../../data/social-media-post.json";
import infographicEduVisual from "../../../../data/infographic-edu-visual.json";
import youtubeThumbnail from "../../../../data/youtube-thumbnail.json";
import comicStoryboard from "../../../../data/comic-storyboard.json";
import productMarketing from "../../../../data/product-marketing.json";
import ecommerceMainImage from "../../../../data/ecommerce-main-image.json";
import gameAsset from "../../../../data/game-asset.json";
import posterFlyer from "../../../../data/poster-flyer.json";
import appWebDesign from "../../../../data/app-web-design.json";
import others from "../../../../data/others.json";

// Mapeamento de categoria para o objeto JSON importado
const CATEGORY_DATA: Record<string, any[]> = {
    "profile-avatar": profileAvatar,
    "social-media-post": socialMediaPost,
    "infographic-edu-visual": infographicEduVisual,
    "youtube-thumbnail": youtubeThumbnail,
    "comic-storyboard": comicStoryboard,
    "product-marketing": productMarketing,
    "ecommerce-main-image": ecommerceMainImage,
    "game-asset": gameAsset,
    "poster-flyer": posterFlyer,
    "app-web-design": appWebDesign,
    "others": others,
};

function loadCategory(categoryId: string): Prompt[] {
    return (CATEGORY_DATA[categoryId] || []) as Prompt[];
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
