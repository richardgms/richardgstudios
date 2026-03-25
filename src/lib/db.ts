import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const DB_URL =
  process.env.TURSO_DATABASE_URL ??
  `file:${path.join(process.cwd(), "data", "studio.db")}`;

let _client: Client | null = null;
let _initPromise: Promise<Client> | null = null;

async function initDb(): Promise<Client> {
  if (DB_URL.startsWith("file:")) {
    const dbPath = DB_URL.replace(/^file:/, "");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const client = createClient({
    url: DB_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Helper: run a single statement, ignore errors
  const tryExec = async (sql: string) => {
    try {
      await client.execute(sql);
    } catch { /* ignore */ }
  };

  // Create core tables (split on ; and run each)
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      session_id TEXT REFERENCES sessions(id),
      prompt TEXT NOT NULL,
      prompt_source TEXT,
      model TEXT NOT NULL,
      aspect_ratio TEXT DEFAULT '1:1',
      image_path TEXT,
      notes TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      media_type TEXT DEFAULT 'image',
      operation_id TEXT,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      attachments TEXT
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      prompt_index INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ps_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ps_prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      folder_id TEXT REFERENCES ps_folders(id) ON DELETE SET NULL,
      color TEXT DEFAULT 'bg-blue-500',
      is_favorite INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS character_vault (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS character_references (
      id TEXT PRIMARY KEY,
      character_id TEXT REFERENCES character_vault(id) ON DELETE CASCADE,
      slot_index INTEGER,
      image_path TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kb_boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT 'bg-amber-500',
      is_favorite INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS kb_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES kb_boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      wip_limit INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kb_cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES kb_columns(id) ON DELETE CASCADE,
      board_id TEXT NOT NULL REFERENCES kb_boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT,
      priority TEXT DEFAULT 'none',
      due_date TEXT,
      is_completed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kb_labels (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES kb_boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kb_card_labels (
      card_id TEXT NOT NULL REFERENCES kb_cards(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES kb_labels(id) ON DELETE CASCADE,
      PRIMARY KEY (card_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS kb_checklist (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES kb_cards(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_checked INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `;

  for (const stmt of schemaSql.split(";").map(s => s.trim()).filter(Boolean)) {
    await tryExec(stmt);
  }

  // Seed PromptSave defaults
  const seedSql = `
    INSERT OR IGNORE INTO ps_folders (id, name) VALUES ('f1', 'Assistentes de Código');
    INSERT OR IGNORE INTO ps_folders (id, name) VALUES ('f2', 'Geração de Imagem');
    INSERT OR IGNORE INTO ps_prompts (id, title, content, folder_id, color) VALUES ('p1', 'Especialista em React', 'Atue como um engenheiro React sênior. Crie um componente funcional usando Tailwind CSS que...', 'f1', 'bg-blue-500');
    INSERT OR IGNORE INTO ps_prompts (id, title, content, folder_id, color) VALUES ('p2', 'Fotorealismo no Midjourney', '/imagine prompt: Uma cena cinematográfica de uma cidade cibernética à noite, luzes neon, chuva no asfalto, resolução 8k, renderização unreal engine 5 --ar 16:9', 'f2', 'bg-purple-500')
  `;
  for (const stmt of seedSql.split(";").map(s => s.trim()).filter(Boolean)) {
    await tryExec(stmt);
  }

  // FTS5 virtual table and triggers
  const ftsSql = `
    CREATE VIRTUAL TABLE IF NOT EXISTS chat_fts USING fts5(
      message_id UNINDEXED,
      session_id UNINDEXED,
      session_name,
      message_content,
      agent UNINDEXED,
      tokenize='unicode61 remove_diacritics 1'
    );

    CREATE TRIGGER IF NOT EXISTS chat_fts_insert
    AFTER INSERT ON chat_messages
    BEGIN
      INSERT INTO chat_fts (message_id, session_id, session_name, message_content, agent)
      SELECT NEW.id, NEW.session_id, s.name, NEW.content, s.agent
      FROM chat_sessions s WHERE s.id = NEW.session_id;
    END;

    CREATE TRIGGER IF NOT EXISTS chat_fts_delete
    AFTER DELETE ON chat_messages
    BEGIN
      DELETE FROM chat_fts WHERE message_id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS chat_fts_update_session
    AFTER UPDATE OF name, agent ON chat_sessions
    BEGIN
      UPDATE chat_fts SET session_name = NEW.name, agent = NEW.agent WHERE session_id = NEW.id;
    END
  `;
  for (const stmt of ftsSql.split(";").map(s => s.trim()).filter(Boolean)) {
    await tryExec(stmt);
  }

  // Seed initial FTS data if empty
  try {
    const ftsCountResult = await client.execute("SELECT COUNT(*) as c FROM chat_fts");
    const ftsCount = ftsCountResult.rows[0] as any;
    if ((ftsCount?.c ?? 0) === 0) {
      await tryExec(`
        INSERT INTO chat_fts (message_id, session_id, session_name, message_content, agent)
        SELECT m.id, m.session_id, s.name, m.content, s.agent
        FROM chat_messages m
        JOIN chat_sessions s ON s.id = m.session_id
        WHERE s.deleted_at IS NULL
      `);
    }
  } catch { /* FTS5 not supported */ }

  // Migrations: ADD COLUMN (ignore if already exists)
  await tryExec("ALTER TABLE generations ADD COLUMN session_id TEXT REFERENCES sessions(id)");
  await tryExec("ALTER TABLE chat_sessions ADD COLUMN deleted_at DATETIME");
  await tryExec("ALTER TABLE sessions ADD COLUMN deleted_at DATETIME");
  await tryExec("ALTER TABLE projects ADD COLUMN deleted_at DATETIME");
  await tryExec("ALTER TABLE generations ADD COLUMN deleted_at DATETIME");
  await tryExec("ALTER TABLE generations ADD COLUMN media_type TEXT DEFAULT 'image'");
  await tryExec("ALTER TABLE generations ADD COLUMN attachments TEXT");
  await tryExec("ALTER TABLE generations ADD COLUMN operation_id TEXT");
  await tryExec("ALTER TABLE generations ADD COLUMN metadata TEXT");
  await tryExec("ALTER TABLE generations ADD COLUMN status TEXT DEFAULT 'completed'");
  await tryExec("ALTER TABLE ps_prompts ADD COLUMN sort_order INTEGER DEFAULT 0");
  await tryExec("ALTER TABLE generations ADD COLUMN ip TEXT");
  await tryExec("ALTER TABLE generations ADD COLUMN resolution TEXT");
  await tryExec("ALTER TABLE chat_sessions ADD COLUMN agent TEXT DEFAULT 'thomas'");

  _client = client;
  return client;
}

export async function getDb(): Promise<Client> {
  if (_client) return _client;
  if (!_initPromise) _initPromise = initDb();
  return _initPromise;
}

// ── Helpers ──

export async function saveGeneration(data: {
  id: string;
  projectId?: string;
  sessionId?: string;
  ip?: string;
  prompt: string;
  promptSource?: string;
  model: string;
  aspectRatio: string;
  resolution?: string;
  imagePath: string;
  mediaType?: 'image' | 'video';
  operationId?: string | null;
  status?: 'completed' | 'processing' | 'failed';
  attachments?: string | null;
  metadata?: string | null;
}) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO generations (id, project_id, session_id, ip, prompt, prompt_source, model, aspect_ratio, resolution, image_path, media_type, operation_id, status, attachments, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id,
      data.projectId || null,
      data.sessionId || null,
      data.ip || null,
      data.prompt,
      data.promptSource || null,
      data.model,
      data.aspectRatio,
      data.resolution || null,
      data.imagePath,
      data.mediaType || 'image',
      data.operationId || null,
      data.status || 'completed',
      data.attachments || null,
      data.metadata || null,
    ],
  });
}

export async function updateGeneration(id: string, updates: {
  status?: 'completed' | 'processing' | 'failed';
  imagePath?: string;
  operationId?: string | null;
}) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.imagePath !== undefined) { fields.push("image_path = ?"); values.push(updates.imagePath); }
  if (updates.operationId !== undefined) { fields.push("operation_id = ?"); values.push(updates.operationId); }

  if (fields.length > 0) {
    values.push(id);
    await db.execute({ sql: `UPDATE generations SET ${fields.join(', ')} WHERE id = ?`, args: values });
  }
}

// Chat Helpers

export async function createChatSession(name: string, agent: string = "thomas"): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO chat_sessions (id, name, agent) VALUES (?, ?, ?)", args: [id, name, agent] });
  return id;
}

export async function getChatSessions(agent: string = "thomas") {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM chat_sessions WHERE deleted_at IS NULL AND agent = ? ORDER BY updated_at DESC",
    args: [agent],
  });
  return result.rows as any[] as { id: string; name: string; agent: string; created_at: string; updated_at: string }[];
}

export async function deleteChatSession(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM chat_sessions WHERE id = ?", args: [id] });
}

export async function addChatMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)", args: [id, sessionId, role, content] });
  await db.execute({ sql: "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [sessionId] });
  return id;
}

export async function getChatMessages(sessionId: string) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
    args: [sessionId],
  });
  return result.rows as any[] as { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
}

export async function getChatSession(id: string) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM chat_sessions WHERE id = ?", args: [id] });
  return (result.rows[0] ?? undefined) as { id: string; name: string; agent: string; created_at: string; updated_at: string } | undefined;
}

export async function searchChatSessions(query: string, agent: string = "thomas") {
  const db = await getDb();

  const cleanSource = query.replace(/[^\w\s\u00C0-\u00FF]/g, ' ').trim();
  if (!cleanSource) return [];

  const reservedWords = /^(AND|OR|NOT|NEAR)$/i;
  const words = cleanSource.split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => reservedWords.test(w) ? `"${w}"` : w);

  if (words.length === 0) return [];
  const ftsQuery = words.map(w => `"${w}"*`).join(' AND ');

  try {
    const result = await db.execute({
      sql: `
        SELECT
          s.id,
          s.name,
          s.agent,
          s.created_at,
          s.updated_at,
          snippet(chat_fts, 3, '<mark class="bg-accent/20 text-accent-light rounded px-0.5">', '</mark>', '...', 15) as snippet_content,
          snippet(chat_fts, 2, '<mark class="bg-accent/20 text-accent-light rounded px-0.5">', '</mark>', '...', 15) as snippet_name,
          bm25(chat_fts) as rank
        FROM chat_fts f
        JOIN chat_sessions s ON s.id = f.session_id
        WHERE chat_fts MATCH ?
          AND f.agent = ?
          AND s.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY rank
        LIMIT 30
      `,
      args: [ftsQuery, agent],
    });

    const rawSessions = result.rows as any[];
    return rawSessions.map(s => ({
      id: s.id,
      name: s.name,
      agent: s.agent,
      created_at: s.created_at,
      updated_at: s.updated_at,
      snippet: (s.snippet_content && s.snippet_content.includes('<mark'))
        ? s.snippet_content
        : (s.snippet_name && s.snippet_name.includes('<mark') ? s.snippet_name : (s.snippet_content || s.name))
    }));
  } catch (err) {
    console.warn("Erro na busca FTS5:", err);
    const fallback = await db.execute({
      sql: `
        SELECT s.id, s.name, s.agent, s.created_at, s.updated_at, m.content as snippet
        FROM chat_sessions s
        JOIN chat_messages m ON m.session_id = s.id
        WHERE s.deleted_at IS NULL AND s.agent = ? AND (s.name LIKE ? OR m.content LIKE ?)
        GROUP BY s.id
        ORDER BY s.updated_at DESC
        LIMIT 30
      `,
      args: [agent, `%${cleanSource}%`, `%${cleanSource}%`],
    });
    return fallback.rows as any[];
  }
}

export async function getGenerations(limit = 50, offset = 0) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT *, metadata FROM generations WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
    args: [limit, offset],
  });
  return result.rows as any[];
}

export async function getGenerationCount(): Promise<number> {
  const db = await getDb();
  const result = await db.execute("SELECT COUNT(*) as count FROM generations WHERE deleted_at IS NULL");
  const row = result.rows[0] as any;
  return row?.count ?? 0;
}

export async function toggleFavorite(generationId: string): Promise<boolean> {
  const db = await getDb();
  await db.execute({ sql: "UPDATE generations SET is_favorite = NOT is_favorite WHERE id = ?", args: [generationId] });
  const result = await db.execute({ sql: "SELECT is_favorite FROM generations WHERE id = ?", args: [generationId] });
  const row = result.rows[0] as any;
  return row?.is_favorite === 1;
}

export async function getFavoriteGenerations() {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, prompt, model, aspect_ratio, resolution, image_path, is_favorite, created_at, media_type, status, operation_id, attachments FROM generations WHERE is_favorite = 1 AND deleted_at IS NULL ORDER BY created_at DESC"
  );
  return result.rows as any[] as Array<{
    id: string;
    prompt: string;
    model: string;
    aspect_ratio: string;
    resolution?: string;
    image_path: string;
    is_favorite: number;
    created_at: string;
    media_type: 'image' | 'video';
    status: 'completed' | 'processing' | 'failed';
    operation_id: string | null;
    attachments: string | null;
  }>;
}

// ── Sessions ──

export async function createSession(name: string): Promise<string> {
  const db = await getDb();
  const id = require("crypto").randomUUID();
  await db.execute({ sql: "INSERT INTO sessions (id, name) VALUES (?, ?)", args: [id, name] });
  return id;
}

export async function updateSession(id: string, name: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE sessions SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [name, id] });
}

export async function getSessions() {
  const db = await getDb();
  const result = await db.execute(`
    SELECT s.id, s.name, s.created_at, s.updated_at,
           COUNT(g.id) as image_count
    FROM sessions s
    LEFT JOIN generations g ON g.session_id = s.id AND g.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `);
  return result.rows as any[] as Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    image_count: number;
  }>;
}

export async function getSessionWithGenerations(sessionId: string) {
  const db = await getDb();
  const sessionResult = await db.execute({ sql: "SELECT * FROM sessions WHERE id = ?", args: [sessionId] });
  const session = sessionResult.rows[0] as any;
  if (!session) return null;

  const gensResult = await db.execute({
    sql: "SELECT id, prompt, model, aspect_ratio, resolution, image_path, is_favorite, created_at, media_type, status, operation_id, attachments, metadata FROM generations WHERE session_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    args: [sessionId],
  });
  const generations = gensResult.rows as any[];

  return { ...session, generations };
}

export async function deleteSession(sessionId: string) {
  const db = await getDb();
  const gensResult = await db.execute({ sql: "SELECT image_path FROM generations WHERE session_id = ?", args: [sessionId] });
  for (const gen of gensResult.rows as any[]) {
    const fullPath = path.join(process.cwd(), gen.image_path);
    try { fs.unlinkSync(fullPath); } catch { /* file may not exist */ }
  }
  await db.execute({ sql: "DELETE FROM generations WHERE session_id = ?", args: [sessionId] });
  await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sessionId] });
}

export async function enforceSessionLimit(sessionId: string, limit = 10) {
  const db = await getDb();
  const countResult = await db.execute({ sql: "SELECT COUNT(*) as count FROM generations WHERE session_id = ?", args: [sessionId] });
  const countRow = countResult.rows[0] as any;

  if ((countRow?.count ?? 0) >= limit) {
    const oldestResult = await db.execute({
      sql: `SELECT id, image_path FROM generations
            WHERE session_id = ?
            AND is_favorite = 0
            AND project_id IS NULL
            ORDER BY created_at ASC LIMIT 1`,
      args: [sessionId],
    });
    const oldest = oldestResult.rows[0] as any;
    if (oldest) {
      await db.execute({ sql: "UPDATE generations SET session_id = NULL WHERE id = ?", args: [oldest.id] });
    }
  }

  await db.execute({ sql: "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [sessionId] });
}

// ── Projects ──

export async function createProject(name: string, description?: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO projects (id, name, description) VALUES (?, ?, ?)", args: [id, name, description || null] });
  return id;
}

export async function getProjects() {
  const db = await getDb();
  const result = await db.execute(`
    SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
           COUNT(g.id) as image_count
    FROM projects p
    LEFT JOIN generations g ON g.project_id = p.id AND g.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `);
  return result.rows as any[] as Array<{
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    image_count: number;
  }>;
}

export async function getProjectById(projectId: string) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL", args: [projectId] });
  return (result.rows[0] ?? undefined) as { id: string; name: string; description: string | null; created_at: string; updated_at: string } | undefined;
}

export async function updateProject(projectId: string, name: string, description?: string) {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [name, description || null, projectId],
  });
}

export async function deleteProject(projectId: string) {
  await softDelete("projects", projectId);
}

export async function getProjectWithGenerations(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const db = await getDb();
  const gensResult = await db.execute({
    sql: "SELECT id, prompt, model, aspect_ratio, resolution, image_path, is_favorite, created_at, media_type, status, operation_id, attachments, metadata FROM generations WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    args: [projectId],
  });
  const generations = gensResult.rows as any[];

  return { ...project, generations };
}

export async function moveGenerationToProject(generationId: string, projectId: string | null) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE generations SET project_id = ? WHERE id = ?", args: [projectId, generationId] });
  if (projectId) {
    await db.execute({ sql: "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [projectId] });
  }
}

// ── Trash System ──

export async function softDelete(table: "chat_sessions" | "generations" | "sessions" | "projects", id: string) {
  const db = await getDb();
  await db.execute({ sql: `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [id] });
}

export async function restore(table: "chat_sessions" | "generations" | "sessions" | "projects", id: string) {
  const db = await getDb();
  await db.execute({ sql: `UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, args: [id] });
}

export async function hardDelete(table: "chat_sessions" | "generations" | "sessions" | "projects", id: string) {
  const db = await getDb();

  if (table === "generations") {
    const rowResult = await db.execute({ sql: "SELECT image_path FROM generations WHERE id = ?", args: [id] });
    const row = rowResult.rows[0] as any;
    if (row?.image_path) {
      const fullPath = path.join(process.cwd(), row.image_path);
      try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    }
  }

  if (table === "projects") {
    const gensResult = await db.execute({ sql: "SELECT image_path FROM generations WHERE project_id = ?", args: [id] });
    for (const gen of gensResult.rows as any[]) {
      const fullPath = path.join(process.cwd(), gen.image_path);
      try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    }
    await db.execute({ sql: "DELETE FROM generations WHERE project_id = ?", args: [id] });
  } else if (table === "sessions") {
    const gensResult = await db.execute({ sql: "SELECT image_path FROM generations WHERE session_id = ?", args: [id] });
    for (const gen of gensResult.rows as any[]) {
      const fullPath = path.join(process.cwd(), gen.image_path);
      try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    }
    await db.execute({ sql: "DELETE FROM generations WHERE session_id = ?", args: [id] });
  }

  await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
}

export async function getTrashItems() {
  const db = await getDb();
  const chats = (await db.execute("SELECT id, name, deleted_at FROM chat_sessions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")).rows as any[];
  const generations = (await db.execute("SELECT id, prompt, image_path, deleted_at FROM generations WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")).rows as any[];
  const projects = (await db.execute("SELECT id, name, description, deleted_at FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")).rows as any[];
  const sessions = (await db.execute("SELECT id, name, deleted_at FROM sessions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")).rows as any[];

  return {
    chats: chats.map((c: any) => ({ ...c, type: "chat" })),
    images: generations.map((g: any) => ({ ...g, type: "image", url: `/api/images/${g.image_path.replace("storage/", "")}` })),
    projects: projects.map((p: any) => ({ ...p, type: "project" })),
    sessions: sessions.map((s: any) => ({ ...s, type: "session" })),
  };
}

// ── PromptSave ──

export async function getPsFolders() {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM ps_folders ORDER BY created_at ASC");
  return result.rows as any[] as Array<{ id: string; name: string; created_at: string }>;
}

export async function createPsFolder(name: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO ps_folders (id, name) VALUES (?, ?)", args: [id, name] });
  return id;
}

export async function updatePsFolder(id: string, name: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE ps_folders SET name = ? WHERE id = ?", args: [name, id] });
}

export async function deletePsFolder(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM ps_folders WHERE id = ?", args: [id] });
}

export async function getPsPrompts() {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM ps_prompts ORDER BY sort_order ASC, created_at DESC");
  return result.rows as any[] as Array<{
    id: string; title: string; content: string; folder_id: string | null;
    color: string; is_favorite: number; is_deleted: number;
    created_at: string; updated_at: string; sort_order: number;
  }>;
}

export async function createPsPrompt(data: {
  title: string; content: string; folderId: string | null; color: string;
}): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({
    sql: "INSERT INTO ps_prompts (id, title, content, folder_id, color) VALUES (?, ?, ?, ?, ?)",
    args: [id, data.title, data.content, data.folderId, data.color],
  });
  return id;
}

export async function updatePsPrompt(id: string, data: {
  title: string; content: string; folderId: string | null; color: string;
  isFavorite?: boolean; isDeleted?: boolean;
}) {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE ps_prompts SET title = ?, content = ?, folder_id = ?, color = ?,
          is_favorite = ?, is_deleted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [data.title, data.content, data.folderId, data.color, data.isFavorite ? 1 : 0, data.isDeleted ? 1 : 0, id],
  });
}

export async function togglePsPromptFavorite(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE ps_prompts SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
}

export async function softDeletePsPrompt(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE ps_prompts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
}

export async function restorePsPrompt(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE ps_prompts SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
}

export async function hardDeletePsPrompt(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM ps_prompts WHERE id = ?", args: [id] });
}

export async function reorderPsPrompts(orderedIds: string[]) {
  const db = await getDb();
  await db.batch(orderedIds.map((id, index) => ({
    sql: "UPDATE ps_prompts SET sort_order = ? WHERE id = ?",
    args: [index, id],
  })));
}

// ── Character Vault ──

export async function createCharacter(name: string, description?: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO character_vault (id, name, description) VALUES (?, ?, ?)", args: [id, name, description || null] });
  return id;
}

export async function addCharacterReference(characterId: string, imagePath: string, slotIndex?: number, metadata?: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({
    sql: "INSERT INTO character_references (id, character_id, image_path, slot_index, metadata) VALUES (?, ?, ?, ?, ?)",
    args: [id, characterId, imagePath, slotIndex ?? null, metadata || null],
  });
  return id;
}

export async function getCharacters() {
  const db = await getDb();
  const result = await db.execute(`
    SELECT c.*, COUNT(r.id) as ref_count
    FROM character_vault c
    LEFT JOIN character_references r ON r.character_id = c.id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `);
  return result.rows as any[];
}

export async function getCharacterWithReferences(characterId: string) {
  const db = await getDb();
  const charResult = await db.execute({ sql: "SELECT * FROM character_vault WHERE id = ?", args: [characterId] });
  const character = charResult.rows[0];
  if (!character) return null;
  const refsResult = await db.execute({ sql: "SELECT * FROM character_references WHERE character_id = ? ORDER BY created_at ASC", args: [characterId] });
  return { ...character, references: refsResult.rows } as any;
}

// ── KanBoard ──

export async function createKbBoard(name: string, description?: string, color?: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({
    sql: "INSERT INTO kb_boards (id, name, description, color) VALUES (?, ?, ?, ?)",
    args: [id, name, description || null, color || 'bg-amber-500'],
  });
  return id;
}

export async function getKbBoards() {
  const db = await getDb();
  const result = await db.execute(`
    SELECT b.*,
      (SELECT COUNT(*) FROM kb_columns c WHERE c.board_id = b.id) as column_count,
      (SELECT COUNT(*) FROM kb_cards k WHERE k.board_id = b.id) as card_count
    FROM kb_boards b
    ORDER BY b.sort_order ASC, b.created_at DESC
  `);
  return result.rows as any[] as Array<{
    id: string; name: string; description: string | null; color: string;
    is_favorite: number; is_deleted: number; sort_order: number;
    created_at: string; updated_at: string; deleted_at: string | null;
    column_count: number; card_count: number;
  }>;
}

export async function getKbBoard(id: string) {
  const db = await getDb();
  const boardResult = await db.execute({ sql: "SELECT * FROM kb_boards WHERE id = ?", args: [id] });
  const board = boardResult.rows[0];
  if (!board) return null;

  const columns = (await db.execute({ sql: "SELECT * FROM kb_columns WHERE board_id = ? ORDER BY sort_order ASC", args: [id] })).rows as any[];
  const cards = (await db.execute({ sql: "SELECT * FROM kb_cards WHERE board_id = ? ORDER BY sort_order ASC", args: [id] })).rows as any[];
  const labels = (await db.execute({ sql: "SELECT * FROM kb_labels WHERE board_id = ?", args: [id] })).rows as any[];
  const cardLabels = (await db.execute({
    sql: `SELECT cl.card_id, cl.label_id FROM kb_card_labels cl
          JOIN kb_cards c ON c.id = cl.card_id WHERE c.board_id = ?`,
    args: [id],
  })).rows as any[];

  return { board, columns, cards, labels, cardLabels };
}

export async function updateKbBoard(id: string, data: { name?: string; description?: string; color?: string }) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await db.execute({ sql: `UPDATE kb_boards SET ${fields.join(', ')} WHERE id = ?`, args: values });
  }
}

export async function toggleKbBoardFavorite(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE kb_boards SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
}

export async function softDeleteKbBoard(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE kb_boards SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
}

export async function restoreKbBoard(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE kb_boards SET is_deleted = 0, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [id] });
}

export async function hardDeleteKbBoard(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM kb_boards WHERE id = ?", args: [id] });
}

// Columns

export async function createKbColumn(boardId: string, name: string, color?: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  const maxResult = await db.execute({ sql: "SELECT COALESCE(MAX(sort_order), -1) as m FROM kb_columns WHERE board_id = ?", args: [boardId] });
  const maxOrder = (maxResult.rows[0] as any)?.m ?? -1;
  await db.execute({
    sql: "INSERT INTO kb_columns (id, board_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [id, boardId, name, color || null, maxOrder + 1],
  });
  return id;
}

export async function updateKbColumn(id: string, data: { name?: string; color?: string; wipLimit?: number }) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (data.wipLimit !== undefined) { fields.push("wip_limit = ?"); values.push(data.wipLimit); }
  if (fields.length > 0) {
    values.push(id);
    await db.execute({ sql: `UPDATE kb_columns SET ${fields.join(', ')} WHERE id = ?`, args: values });
  }
}

export async function deleteKbColumn(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM kb_columns WHERE id = ?", args: [id] });
}

export async function reorderKbColumns(orderedIds: string[]) {
  const db = await getDb();
  await db.batch(orderedIds.map((id, index) => ({
    sql: "UPDATE kb_columns SET sort_order = ? WHERE id = ?",
    args: [index, id],
  })));
}

// Cards

export async function createKbCard(data: { columnId: string; boardId: string; title: string; description?: string; color?: string; priority?: string }): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  const maxResult = await db.execute({ sql: "SELECT COALESCE(MAX(sort_order), -1) as m FROM kb_cards WHERE column_id = ?", args: [data.columnId] });
  const maxOrder = (maxResult.rows[0] as any)?.m ?? -1;
  await db.execute({
    sql: "INSERT INTO kb_cards (id, column_id, board_id, title, description, color, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, data.columnId, data.boardId, data.title, data.description || null, data.color || null, data.priority || 'none', maxOrder + 1],
  });
  return id;
}

export async function getKbCard(id: string) {
  const db = await getDb();
  const cardResult = await db.execute({ sql: "SELECT * FROM kb_cards WHERE id = ?", args: [id] });
  const card = cardResult.rows[0];
  if (!card) return null;
  const checklist = (await db.execute({ sql: "SELECT * FROM kb_checklist WHERE card_id = ? ORDER BY sort_order ASC", args: [id] })).rows as any[];
  const labels = (await db.execute({
    sql: `SELECT l.* FROM kb_labels l
          JOIN kb_card_labels cl ON cl.label_id = l.id
          WHERE cl.card_id = ?`,
    args: [id],
  })).rows as any[];
  return { ...card, checklist, labels };
}

export async function updateKbCard(id: string, data: {
  title?: string; description?: string; color?: string; priority?: string;
  dueDate?: string | null; isCompleted?: boolean; columnId?: string;
}) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (data.priority !== undefined) { fields.push("priority = ?"); values.push(data.priority); }
  if (data.dueDate !== undefined) { fields.push("due_date = ?"); values.push(data.dueDate); }
  if (data.isCompleted !== undefined) { fields.push("is_completed = ?"); values.push(data.isCompleted ? 1 : 0); }
  if (data.columnId !== undefined) { fields.push("column_id = ?"); values.push(data.columnId); }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await db.execute({ sql: `UPDATE kb_cards SET ${fields.join(', ')} WHERE id = ?`, args: values });
  }
}

export async function deleteKbCard(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM kb_cards WHERE id = ?", args: [id] });
}

export async function moveKbCard(cardId: string, targetColumnId: string, sortOrder: number) {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE kb_cards SET column_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [targetColumnId, sortOrder, cardId],
  });
}

export async function reorderKbCards(columnId: string, orderedIds: string[]) {
  const db = await getDb();
  await db.batch(orderedIds.map((id, index) => ({
    sql: "UPDATE kb_cards SET sort_order = ?, column_id = ? WHERE id = ?",
    args: [index, columnId, id],
  })));
}

// Labels

export async function createKbLabel(boardId: string, name: string, color: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO kb_labels (id, board_id, name, color) VALUES (?, ?, ?, ?)", args: [id, boardId, name, color] });
  return id;
}

export async function updateKbLabel(id: string, data: { name?: string; color?: string }) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (fields.length > 0) {
    values.push(id);
    await db.execute({ sql: `UPDATE kb_labels SET ${fields.join(', ')} WHERE id = ?`, args: values });
  }
}

export async function deleteKbLabel(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM kb_labels WHERE id = ?", args: [id] });
}

export async function toggleKbCardLabel(cardId: string, labelId: string) {
  const db = await getDb();
  const existingResult = await db.execute({ sql: "SELECT 1 FROM kb_card_labels WHERE card_id = ? AND label_id = ?", args: [cardId, labelId] });
  if (existingResult.rows.length > 0) {
    await db.execute({ sql: "DELETE FROM kb_card_labels WHERE card_id = ? AND label_id = ?", args: [cardId, labelId] });
  } else {
    await db.execute({ sql: "INSERT INTO kb_card_labels (card_id, label_id) VALUES (?, ?)", args: [cardId, labelId] });
  }
}

export async function getKbLabels(boardId: string) {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM kb_labels WHERE board_id = ?", args: [boardId] });
  return result.rows as any[] as Array<{ id: string; board_id: string; name: string; color: string }>;
}

// Checklist

export async function createKbChecklistItem(cardId: string, text: string): Promise<string> {
  const db = await getDb();
  const id = uuidv4();
  const maxResult = await db.execute({ sql: "SELECT COALESCE(MAX(sort_order), -1) as m FROM kb_checklist WHERE card_id = ?", args: [cardId] });
  const maxOrder = (maxResult.rows[0] as any)?.m ?? -1;
  await db.execute({ sql: "INSERT INTO kb_checklist (id, card_id, text, sort_order) VALUES (?, ?, ?, ?)", args: [id, cardId, text, maxOrder + 1] });
  return id;
}

export async function updateKbChecklistItem(id: string, data: { text?: string; isChecked?: boolean }) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.text !== undefined) { fields.push("text = ?"); values.push(data.text); }
  if (data.isChecked !== undefined) { fields.push("is_checked = ?"); values.push(data.isChecked ? 1 : 0); }
  if (fields.length > 0) {
    values.push(id);
    await db.execute({ sql: `UPDATE kb_checklist SET ${fields.join(', ')} WHERE id = ?`, args: values });
  }
}

export async function deleteKbChecklistItem(id: string) {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM kb_checklist WHERE id = ?", args: [id] });
}

export async function toggleKbChecklistItem(id: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE kb_checklist SET is_checked = NOT is_checked WHERE id = ?", args: [id] });
}

export async function reorderKbChecklist(orderedIds: string[]) {
  const db = await getDb();
  await db.batch(orderedIds.map((id, index) => ({
    sql: "UPDATE kb_checklist SET sort_order = ? WHERE id = ?",
    args: [index, id],
  })));
}
