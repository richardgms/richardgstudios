/**
 * Normalizes an image_path stored in the DB to a usable URL.
 * Handles Vercel Blob URLs (https://...), /api/images/... paths,
 * and legacy storage/... paths.
 */
export function toImageUrl(imagePath: string, options?: { w?: number; q?: number }): string {
    if (!imagePath) return "";
    let url = imagePath;
    if (!imagePath.startsWith("http") && !imagePath.startsWith("/api/images/")) {
        url = `/api/images/${imagePath.replace("storage/", "")}`;
    }

    // Resize params only apply to local /api/images/ paths (handled by Sharp).
    // Blob CDN (https://) ignores ?w=&q= and serves the original file regardless,
    // so appending them only busts the browser cache without any benefit.
    if (options && !url.startsWith("http")) {
        const params = new URLSearchParams();
        if (options.w) params.set("w", options.w.toString());
        if (options.q) params.set("q", options.q.toString());
        const queryString = params.toString();
        if (queryString) {
            url += (url.includes("?") ? "&" : "?") + queryString;
        }
    }
    return url;
}
