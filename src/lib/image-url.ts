/**
 * Normalizes an image_path stored in the DB to a usable URL.
 * Handles Vercel Blob URLs (https://...), /api/images/... paths,
 * and legacy storage/... paths.
 */
export function toImageUrl(imagePath: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/api/images/")) return imagePath;
  return `/api/images/${imagePath.replace("storage/", "")}`;
}
