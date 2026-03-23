export type ModelId = "flash" | "nb-pro" | "pro" | "imagen" | "veo-3.1" | "veo-3.1-fast";

export const MAX_ATTACHMENTS: Record<ModelId, number> = {
    flash: 8,
    "nb-pro": 8, // Standardized: 8 images for consistency
    pro: 8,      // Standardized: 8 images for consistency
    imagen: 0,
    "veo-3.1": 1,
    "veo-3.1-fast": 1,
};

export const MODEL_RESOLUTIONS = {
    "pro": [
        { label: "HD (1024x1024)", value: "1024x1024" },
        { label: "FHD (1440x1440)", value: "1440x1440" },
        { label: "2K (2048x2048)", value: "2048x2048" },
        { label: "4K (4096x4096)", value: "4096x4096" }
    ]
};

export const ASPECT_RATIOS = [
    { label: "1:1", value: "1:1", icon: "square" },
    { label: "16:9", value: "16:9", icon: "monitor" },
    { label: "9:16", value: "9:16", icon: "smartphone" },
    { label: "4:3", value: "4:3", icon: "monitor" },
    { label: "3:4", value: "3:4", icon: "smartphone" }
];

export function getMaxAttachments(modelId: string): number {
    return MAX_ATTACHMENTS[modelId as ModelId] || 0;
}
