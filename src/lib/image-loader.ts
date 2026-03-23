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

    // If src already points at our API endpoint, just append resize params
    if (src.startsWith("/api/images/")) {
        return `${src}?w=${width}&q=${q}`;
    }

    // Fallback: treat as a direct path and prepend the API prefix
    const cleanSrc = src.startsWith("/") ? src : `/${src}`;
    return `/api/images${cleanSrc}?w=${width}&q=${q}`;
};
