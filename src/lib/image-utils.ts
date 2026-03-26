/**
 * Optimizes an image file by resizing and compressing it.
 * Uses a strict binary limit to ensure Vercel payload safety.
 * 
 * Target: Max 3MB total payload for all images.
 * Single Image Target: ~300KB-400KB
 */
export async function compressImage(file: File, maxDimension = 1024, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Resize logic
                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                // Security: This redraw strips EXIF and sanitizes the image data
                ctx.drawImage(img, 0, 0, width, height);

                // Export as JPEG for better compression than PNG for photos
                // If it's a transparent image, we might lose transparency, but for reference images mostly fine.
                // We can check file type if needed, but 'image/jpeg' provides best size control.
                const base64 = canvas.toDataURL("image/jpeg", quality);
                resolve(base64); // Returns data:image/jpeg;base64,...
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Compresses an image File and returns a new File (Blob) suitable for upload.
 * Used by brainstorm to bring images under Vercel's 4.5MB body limit.
 */
export async function compressImageToFile(file: File, maxDimension = 2048, quality = 0.85): Promise<File> {
    // Skip compression for small files (under 4MB)
    if (file.size < 4 * 1024 * 1024) return file;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) { reject(new Error("Could not get canvas context")); return; }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
                        resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
                    },
                    "image/jpeg",
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Calculates the rough binary size of a base64 string
 */
export function getBase64Size(base64: string): number {
    const stringLength = base64.length - (base64.indexOf(',') + 1);
    const sizeInBytes = 4 * Math.ceil((stringLength / 3)) * 0.5624896334383812;
    return sizeInBytes; // Approximate
}
