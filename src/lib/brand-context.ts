import type { BrandKitRow, BrandKitAssetRow } from "./db";

/**
 * Composes the brand identity text from structured fields.
 * Empty fields are omitted from the output.
 */
export function composeBrandText(brand: BrandKitRow): string {
    const lines: string[] = [];

    lines.push(`Você está criando conteúdo para ${brand.name}.`);
    if (brand.segment) lines.push(`Segmento: ${brand.segment}.`);

    const colorParts: string[] = [];
    if (brand.primary_color) colorParts.push(`cor primária ${brand.primary_color}`);
    if (brand.secondary_color) colorParts.push(`cor secundária ${brand.secondary_color}`);
    if (brand.accent_color) colorParts.push(`cor de destaque ${brand.accent_color}`);
    if (colorParts.length) lines.push(`Paleta de cores: ${colorParts.join(", ")}.`);

    const fontParts: string[] = [];
    if (brand.primary_font) fontParts.push(`${brand.primary_font} (principal)`);
    if (brand.secondary_font) fontParts.push(`${brand.secondary_font} (secundária)`);
    if (fontParts.length) lines.push(`Tipografia: ${fontParts.join(", ")}.`);

    if (brand.visual_style) lines.push(`Estilo visual: ${brand.visual_style}.`);
    if (brand.tone_of_voice) lines.push(`Tom de voz: ${brand.tone_of_voice}.`);
    if (brand.description) lines.push(`Sobre a marca: ${brand.description}.`);
    if (brand.extra_notes) lines.push(`Regras adicionais: ${brand.extra_notes}`);

    return lines.join("\n");
}

/**
 * Builds the acknowledgment message the model sends after receiving brand context.
 */
export function composeBrandAck(brandName: string): string {
    return `Entendido! Contexto da marca **${brandName}** carregado. Estou pronto para criar conteúdo alinhado com a identidade visual e o tom de voz da marca. Pode mandar a ideia!`;
}

/**
 * Shape of an inline image part ready for Gemini.
 */
export type InlineImagePart = {
    inlineData: { mimeType: string; data: string };
};

/**
 * Fetches all assets for a brand from R2 and returns them as base64 inline parts.
 * Silently skips assets that fail to fetch (logs the error).
 */
export async function buildBrandImageParts(assets: BrandKitAssetRow[]): Promise<InlineImagePart[]> {
    if (assets.length === 0) return [];

    const { getBrandAssetBuffer } = await import("./blob-storage");

    const results = await Promise.all(
        assets.map(async (asset) => {
            try {
                const buffer = await getBrandAssetBuffer(asset.r2_key);
                return {
                    inlineData: {
                        mimeType: "image/webp",
                        data: buffer.toString("base64"),
                    },
                };
            } catch (err) {
                console.error(`[brand-context] Failed to fetch asset ${asset.r2_key}:`, err);
                return null;
            }
        })
    );

    return results.filter((r): r is InlineImagePart => r !== null);
}
