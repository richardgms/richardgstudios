import path from "path";

// No Vercel, process.cwd() é read-only. Usa /tmp para storage gravável.
// Em desenvolvimento local, usa a raiz do projeto normalmente.
const BASE = process.env.VERCEL ? "/tmp" : process.cwd();

export const DB_PATH = path.join(BASE, "data", "studio.db");
export const STORAGE_ROOT = path.join(BASE, "storage");
