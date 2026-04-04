import type { ImageLoader } from "next/image";

/**
 * Custom loader for next/image that routes through our local
 * /api/images/[...path] endpoint with optional resize + WebP params.
 *
 * The `src` coming in will be something like:
 *   /api/images/_unsorted/abc-123.png
 *
 * We strip the /api/images/ prefix to get the file path segments,
 * then append ?w=<width>&q=<quality> for the resize API.
 */
export const localImageLoader: ImageLoader = ({ src, width, quality }) => {
    const q = quality ?? 80;

    // If the source already carries resize parameters, keep it as-is.
    if (/[?&](w|q)=/i.test(src)) {
        return src;
    }

    // Blob / external URL — return as-is so the browser fetches from CDN directly.
    // Do NOT route through /_next/image (would consume Vercel optimization quota).
    // toImageUrl() guarantees no ?w=&q= params are appended to https:// URLs,
    // so the browser cache key is stable across renders.
    if (src.startsWith("http://") || src.startsWith("https://")) {
        return src;
    }

    // Local API endpoint — append resize params for sharp processing
    if (src.startsWith("/api/images/")) {
        return `${src}?w=${width}&q=${q}`;
    }

    // Fallback: treat as a direct path and prepend the API prefix
    const cleanSrc = src.startsWith("/") ? src : `/${src}`;
    return `/api/images${cleanSrc}?w=${width}&q=${q}`;
};
