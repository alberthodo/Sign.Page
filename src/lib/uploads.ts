export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
]);

export const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"];

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function storagePath(
  userId: string,
  projectId: string,
  fileName: string,
  folderId?: string,
): string {
  const base = folderId
    ? `${userId}/${projectId}/${folderId}`
    : `${userId}/${projectId}`;
  return `${base}/${sanitizeFileName(fileName)}`;
}

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `${file.name}: only PNG, JPG, JPEG, and PDF files are allowed.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name}: must be 10MB or smaller.`;
  }
  return null;
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

/** Path inside the project-assets bucket from a public URL. */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = "/project-assets/";
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}
