import fs from "fs";
import path from "path";
import { STORAGE_ROOT } from "./paths";

const ATTACHMENTS_ROOT = path.join(STORAGE_ROOT, "generations", "attachments");

/**
 * Saves base64 attachments to disk for a specific generation.
 * Returns an array of local URLs to be stored in the database.
 */
export async function saveAttachments(generationId: string, attachments: (string | null)[]): Promise<string[]> {
    const validAttachments = attachments.filter((a): a is string => typeof a === 'string' && a.startsWith('data:image'));
    if (validAttachments.length === 0) return [];

    const targetDir = path.join(ATTACHMENTS_ROOT, generationId);

    // Ensure root and target dir exist
    if (!fs.existsSync(ATTACHMENTS_ROOT)) fs.mkdirSync(ATTACHMENTS_ROOT, { recursive: true });
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const savedPaths: string[] = [];

    for (let i = 0; i < validAttachments.length; i++) {
        const base64Data = validAttachments[i];

        // Extract content after "base64,"
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) continue;

        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        // Determine extension
        let ext = 'png';
        if (type.includes('jpeg')) ext = 'jpg';
        else if (type.includes('webp')) ext = 'webp';

        const filename = `ref_${i}.${ext}`;
        const filePath = path.join(targetDir, filename);

        fs.writeFileSync(filePath, buffer);

        // Return a path that our /api/images route can serve
        // e.g. /api/images/generations/attachments/[ID]/ref_0.png
        savedPaths.push(`/api/images/generations/attachments/${generationId}/${filename}`);
    }

    return savedPaths;
}

/**
 * Deletes attachment folder for a generation
 */
export async function deleteAttachments(generationId: string) {
    const targetDir = path.join(ATTACHMENTS_ROOT, generationId);
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
}
