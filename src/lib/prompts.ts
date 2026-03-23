export interface Prompt {
    content: string;
    title: string;
    description: string;
    sourceMedia: string[];
    needReferenceImages: boolean;
}

export interface PromptWithMeta extends Prompt {
    category: string;
    index: number;
}

export interface CategoryInfo {
    id: string;
    label: string;
    icon: string;
    count: number;
    file: string;
}

export const CATEGORIES: CategoryInfo[] = [
    { id: "profile-avatar", label: "Perfil / Avatar", icon: "👤", count: 949, file: "profile-avatar.json" },
    { id: "social-media-post", label: "Post Redes Sociais", icon: "📱", count: 5612, file: "social-media-post.json" },
    { id: "infographic-edu-visual", label: "Infográfico / Educacional", icon: "📊", count: 426, file: "infographic-edu-visual.json" },
    { id: "youtube-thumbnail", label: "Thumbnail YouTube", icon: "🎬", count: 151, file: "youtube-thumbnail.json" },
    { id: "comic-storyboard", label: "HQ / Storyboard", icon: "🎨", count: 262, file: "comic-storyboard.json" },
    { id: "product-marketing", label: "Marketing de Produto", icon: "📦", count: 3123, file: "product-marketing.json" },
    { id: "ecommerce-main-image", label: "E-commerce", icon: "🛒", count: 326, file: "ecommerce-main-image.json" },
    { id: "game-asset", label: "Game Asset", icon: "🎮", count: 298, file: "game-asset.json" },
    { id: "poster-flyer", label: "Poster / Flyer", icon: "🖼️", count: 435, file: "poster-flyer.json" },
    { id: "app-web-design", label: "App / Web Design", icon: "💻", count: 155, file: "app-web-design.json" },
    { id: "others", label: "Outros", icon: "📁", count: 843, file: "others.json" },
];

export function getCategoryById(id: string): CategoryInfo | undefined {
    return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryLabel(id: string): string {
    return getCategoryById(id)?.label ?? id;
}
