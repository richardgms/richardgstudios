import { saveImage, deleteImage } from "./blob-storage";

/**
 * Saves base64 attachments to Vercel Blob (prod) or local filesystem (dev).
 * Returns an array of URLs to be stored in the database.
 */
export async function saveAttachments(generationId: string, attachments: (string | null)[]): Promise<string[]> {
    const validAttachments = attachments.filter((a): a is string => typeof a === 'string' && a.startsWith('data:image'));
    if (validAttachments.length === 0) return [];

    const savedPaths: string[] = [];

    for (let i = 0; i < validAttachments.length; i++) {
        const base64Data = validAttachments[i];

        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) continue;

        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        let ext = 'png';
        if (type.includes('jpeg')) ext = 'jpg';
        else if (type.includes('webp')) ext = 'webp';

        const pathname = `generations/attachments/${generationId}/ref_${i}.${ext}`;
        const url = await saveImage(pathname, buffer);
        savedPaths.push(url);
    }

    return savedPaths;
}

/**
 * Deletes attachments for a generation.
 */
export async function deleteAttachments(generationId: string) {
    // Blob: individual files would need to be tracked separately.
    // For local dev, this is a no-op since saveImage handles paths.
    // If needed, implement per-file deletion using the stored URLs.
}
