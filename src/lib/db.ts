import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const DB_PATH = path.join(process.cwd(), "data", "studio.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Criar diretório se não existir
  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Criar tabelas
  _db.exec(`
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
    /* ... existing tables ... */
    
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
      slot_index INTEGER, -- Optional, if tied to a specific slot
      image_path TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- KanBoard tables
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
    );
  `);

  // Migração: Criar tabelas se não existirem (Staff Guard)
  try {
    _db.exec(`CREATE TABLE IF NOT EXISTS character_vault (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    _db.exec(`CREATE TABLE IF NOT EXISTS character_references (id TEXT PRIMARY KEY, character_id TEXT REFERENCES character_vault(id) ON DELETE CASCADE, slot_index INTEGER, image_path TEXT NOT NULL, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  } catch { /* ignore */ }

  // Seed PromptSave defaults (INSERT OR IGNORE = won't duplicate)
  _db.exec(`
    INSERT OR IGNORE INTO ps_folders (id, name) VALUES ('f1', 'Assistentes de Código');
    INSERT OR IGNORE INTO ps_folders (id, name) VALUES ('f2', 'Geração de Imagem');

    INSERT OR IGNORE INTO ps_prompts (id, title, content, folder_id, color)
    VALUES ('p1', 'Especialista em React', 'Atue como um engenheiro React sênior. Crie um componente funcional usando Tailwind CSS que...', 'f1', 'bg-blue-500');

    INSERT OR IGNORE INTO ps_prompts (id, title, content, folder_id, color)
    VALUES ('p2', 'Fotorealismo no Midjourney', '/imagine prompt: Uma cena cinematográfica de uma cidade cibernética à noite, luzes neon, chuva no asfalto, resolução 8k, renderização unreal engine 5 --ar 16:9', 'f2', 'bg-purple-500');
  `);

  // FTS5 para busca no chat
  try {
    _db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chat_fts USING fts5(
        message_id UNINDEXED,
        session_id UNINDEXED,
        session_name,
        message_content,
        agent UNINDEXED,
        tokenize='unicode61 remove_diacritics 1'
      );

      -- Trigger pós mensagem
      CREATE TRIGGER IF NOT EXISTS chat_fts_insert 
      AFTER INSERT ON chat_messages
      BEGIN
        INSERT INTO chat_fts (message_id, session_id, session_name, message_content, agent)
        SELECT NEW.id, NEW.session_id, s.name, NEW.content, s.agent
        FROM chat_sessions s WHERE s.id = NEW.session_id;
      END;

      -- Trigger pós deleção de mensagem
      CREATE TRIGGER IF NOT EXISTS chat_fts_delete
      AFTER DELETE ON chat_messages
      BEGIN
        DELETE FROM chat_fts WHERE message_id = OLD.id;
      END;

      -- Trigger atualização do nome da sessão
      CREATE TRIGGER IF NOT EXISTS chat_fts_update_session
      AFTER UPDATE OF name, agent ON chat_sessions
      BEGIN
        UPDATE chat_fts SET session_name = NEW.name, agent = NEW.agent WHERE session_id = NEW.id;
      END;
    `);

    // Seed initial FTS data se estiver vazio
    const ftsCount = _db.prepare("SELECT COUNT(*) as c FROM chat_fts").get() as { c: number };
    if (ftsCount.c === 0) {
      _db.exec(`
        INSERT INTO chat_fts (message_id, session_id, session_name, message_content, agent)
        SELECT m.id, m.session_id, s.name, m.content, s.agent
        FROM chat_messages m
        JOIN chat_sessions s ON s.id = m.session_id
        WHERE s.deleted_at IS NULL;
      `);
    }
  } catch (e) {
    console.warn("FTS5 não suportado ou erro inicializando busca:", e);
  }

  // Migração: adicionar session_id se não existir (para generations)
  try {
    _db.exec("ALTER TABLE generations ADD COLUMN session_id TEXT REFERENCES sessions(id)");
  } catch { /* ignorar */ }

  // Migração: Soft Delete (deleted_at)
  try {
    _db.exec("ALTER TABLE chat_sessions ADD COLUMN deleted_at DATETIME");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE sessions ADD COLUMN deleted_at DATETIME");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE projects ADD COLUMN deleted_at DATETIME");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE generations ADD COLUMN deleted_at DATETIME");
  } catch { /* ignorar se já existe */ }

  // Migração: Veo 3.1 Media Type e Async Operations
  try {
    _db.exec("ALTER TABLE generations ADD COLUMN media_type TEXT DEFAULT 'image'");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE generations ADD COLUMN attachments TEXT");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE generations ADD COLUMN operation_id TEXT");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE generations ADD COLUMN metadata TEXT");
  } catch { /* ignorar se já existe */ }

  try {
    _db.exec("ALTER TABLE generations ADD COLUMN status TEXT DEFAULT 'completed'");
  } catch { /* ignorar se já existe */ }

  // Migração: sort_order para ps_prompts
  try {
    _db.exec("ALTER TABLE ps_prompts ADD COLUMN sort_order INTEGER DEFAULT 0");
  } catch { /* ignorar se já existe */ }

  // Migração: IP para rate limiting
  try {
    _db.exec("ALTER TABLE generations ADD COLUMN ip TEXT");
  } catch { /* ignorar */ }

  return _db;
}

// Helpers tipados
export function saveGeneration(data: {
  id: string;
  projectId?: string;
  sessionId?: string;
  ip?: string; // Add IP field
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
  const db = getDb();

  // Ensure columns exist
  try {
    db.exec("ALTER TABLE generations ADD COLUMN resolution TEXT");
  } catch { /* ignore if exists */ }
  try {
    db.exec("ALTER TABLE generations ADD COLUMN metadata TEXT");
  } catch { /* ignore */ }
  try {
    db.exec("ALTER TABLE generations ADD COLUMN ip TEXT");
  } catch { /* ignore */ }

  const stmt = db.prepare(`
    INSERT INTO generations (id, project_id, session_id, ip, prompt, prompt_source, model, aspect_ratio, resolution, image_path, media_type, operation_id, status, attachments, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
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
    data.metadata || null
  );
}

export function updateGeneration(id: string, updates: {
  status?: 'completed' | 'processing' | 'failed';
  imagePath?: string;
  operationId?: string | null;
}) {
  const db = getDb();
  const fields = [];
  const values = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.imagePath !== undefined) {
    fields.push("image_path = ?");
    values.push(updates.imagePath);
  }
  if (updates.operationId !== undefined) {
    fields.push("operation_id = ?");
    values.push(updates.operationId);
  }

  if (fields.length > 0) {
    const query = `UPDATE generations SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.prepare(query).run(...values);
  }
}

// ... existing helpers ...

// Chat Helpers
export function createChatSession(name: string, agent: string = "thomas") {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO chat_sessions (id, name, agent) VALUES (?, ?, ?)").run(id, name, agent);
  return id;
}

export function getChatSessions(agent: string = "thomas") {
  const db = getDb();
  return db.prepare("SELECT * FROM chat_sessions WHERE deleted_at IS NULL AND agent = ? ORDER BY updated_at DESC").all(agent) as { id: string; name: string; agent: string; created_at: string; updated_at: string }[];
}

export function deleteChatSession(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(id);
}

export function addChatMessage(sessionId: string, role: "user" | "assistant", content: string) {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)").run(id, sessionId, role, content);

  // Atualizar timestamp da sessão
  db.prepare("UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
  return id;
}

export function getChatMessages(sessionId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC").all(sessionId) as { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
}

export function getChatSession(id: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(id) as { id: string; name: string; agent: string; created_at: string; updated_at: string } | undefined;
}

export function searchChatSessions(query: string, agent: string = "thomas") {
  const db = getDb();

  // Regex robusto para FTS5 (security-auditor & sql-injection-testing)
  // Remove operadores especiais que podem quebrar a query ou causar vazamento (NEAR, AND, OR, NOT)
  const cleanSource = query.replace(/[^\w\s\u00C0-\u00FF]/g, ' ').trim();
  if (!cleanSource) return [];

  // Transforma em busca por prefixo em todas as palavras, mas neutraliza termos reservados do FTS5
  const reservedWords = /^(AND|OR|NOT|NEAR)$/i;
  const words = cleanSource.split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => reservedWords.test(w) ? `"${w}"` : w); // Quota palavras reservadas se aparecerem como busca comum

  if (words.length === 0) return [];
  const ftsQuery = words.map(w => `"${w}"*`).join(' AND ');

  try {
    const rawSessions = db.prepare(`
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
    `).all(ftsQuery, agent) as Array<{
      id: string;
      name: string;
      agent: string;
      created_at: string;
      updated_at: string;
      snippet_content: string | null;
      snippet_name: string | null;
    }>;

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
    return db.prepare(`
      SELECT s.id, s.name, s.agent, s.created_at, s.updated_at, m.content as snippet
      FROM chat_sessions s
      JOIN chat_messages m ON m.session_id = s.id
      WHERE s.deleted_at IS NULL AND s.agent = ? AND (s.name LIKE ? OR m.content LIKE ?)
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT 30
    `).all(agent, `%${cleanSource}%`, `%${cleanSource}%`) as any[];
  }
}

export function getGenerations(limit = 50, offset = 0) {
  const db = getDb();
  return db
    .prepare("SELECT *, metadata FROM generations WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset);
}

export function getGenerationCount() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM generations WHERE deleted_at IS NULL").get() as { count: number };
  return row.count;
}

export function toggleFavorite(generationId: string): boolean {
  const db = getDb();
  db.prepare("UPDATE generations SET is_favorite = NOT is_favorite WHERE id = ?").run(generationId);
  const row = db.prepare("SELECT is_favorite FROM generations WHERE id = ?").get(generationId) as { is_favorite: number } | undefined;
  return row?.is_favorite === 1;
}

export function getFavoriteGenerations() {
  const db = getDb();
  return db.prepare(
    "SELECT id, prompt, model, aspect_ratio, resolution, image_path, is_favorite, created_at, media_type, status, operation_id, attachments FROM generations WHERE is_favorite = 1 AND deleted_at IS NULL ORDER BY created_at DESC"
  ).all() as Array<{
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
  }>;
}

// ── Sessões ──

export function createSession(name: string): string {
  const db = getDb();
  const id = require("crypto").randomUUID();
  db.prepare("INSERT INTO sessions (id, name) VALUES (?, ?)").run(id, name);
  return id;
}

export function updateSession(id: string, name: string) {
  const db = getDb();
  db.prepare("UPDATE sessions SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, id);
}

export function getSessions() {
  const db = getDb();
  return db.prepare(`
    SELECT s.id, s.name, s.created_at, s.updated_at,
           COUNT(g.id) as image_count
    FROM sessions s
    LEFT JOIN generations g ON g.session_id = s.id AND g.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `).all() as Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    image_count: number;
  }>;
}

export function getSessionWithGenerations(sessionId: string) {
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as {
    id: string; name: string; created_at: string; updated_at: string;
  } | undefined;

  if (!session) return null;

  const generations = db.prepare(
    "SELECT id, prompt, model, aspect_ratio, resolution, image_path, is_favorite, created_at, media_type, status, operation_id, attachments, metadata FROM generations WHERE session_id = ? AND deleted_at IS NULL ORDER BY created_at DESC"
  ).all(sessionId) as Array<{
    id: string; prompt: string; model: string; aspect_ratio: string; resolution?: string;
    image_path: string; is_favorite: number; created_at: string;
    media_type: 'image' | 'video'; status: 'completed' | 'processing' | 'failed'; operation_id: string | null;
    attachments: string | null; metadata: string | null;
  }>;

  return { ...session, generations };
}

export function deleteSession(sessionId: string) {
  const db = getDb();
  // Deletar arquivos de imagens da sessão
  const gens = db.prepare("SELECT image_path FROM generations WHERE session_id = ?").all(sessionId) as Array<{ image_path: string }>;
  for (const gen of gens) {
    const fullPath = path.join(process.cwd(), gen.image_path);
    try { fs.unlinkSync(fullPath); } catch { /* arquivo pode não existir */ }
  }
  db.prepare("DELETE FROM generations WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function enforceSessionLimit(sessionId: string, limit = 10) {
  const db = getDb();
  const countRow = db.prepare("SELECT COUNT(*) as count FROM generations WHERE session_id = ?").get(sessionId) as { count: number };

  if (countRow.count >= limit) {
    // Pegar a geração mais antiga da sessão que NÃO é favorita e NÃO está em projeto
    const oldest = db.prepare(`
      SELECT id, image_path FROM generations 
      WHERE session_id = ? 
      AND is_favorite = 0 
      AND project_id IS NULL
      ORDER BY created_at ASC LIMIT 1
    `).get(sessionId) as { id: string; image_path: string } | undefined;

    if (oldest) {
      // Just detach from session, don't delete from disk or DB
      db.prepare("UPDATE generations SET session_id = NULL WHERE id = ?").run(oldest.id);
    }
  }

  // Atualizar timestamp da sessão
  db.prepare("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
}

// ── Projetos ──

export function createProject(name: string, description?: string): string {
  const db = getDb();
  const id = uuidv4(); // Correct usage of renamed import if needed, or require
  db.prepare("INSERT INTO projects (id, name, description) VALUES (?, ?, ?)").run(id, name, description || null);
  return id;
}

export function getProjects() {
  const db = getDb();
  return db.prepare(`
    SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
           COUNT(g.id) as image_count
    FROM projects p
    LEFT JOIN generations g ON g.project_id = p.id AND g.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all() as Array<{
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    image_count: number;
  }>;
}

export function getProjectById(projectId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL").get(projectId) as {
    id: string; name: string; description: string | null;
    created_at: string; updated_at: string;
  } | undefined;
}

export function updateProject(projectId: string, name: string, description?: string) {
  const db = getDb();
  db.prepare(
    "UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(name, description || null, projectId);
}

export function deleteProject(projectId: string) {
  // Now performing Soft Delete
  softDelete("projects", projectId);
}

// ... helper functions ...

export function getProjectWithGenerations(projectId: string) {
  const db = getDb();
  const project = getProjectById(projectId);
  if (!project) return null;

  const generations = db.prepare(
    "SELECT id, prompt, model, aspect_ratio, resolution, image_path, is_favorite, created_at, media_type, status, operation_id, attachments, metadata FROM generations WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC"
  ).all(projectId) as Array<{
    id: string; prompt: string; model: string; aspect_ratio: string; resolution?: string;
    image_path: string; is_favorite: number; created_at: string;
    media_type: 'image' | 'video'; status: 'completed' | 'processing' | 'failed'; operation_id: string | null;
    attachments: string | null; metadata: string | null;
  }>;

  return { ...project, generations };
}

// ... existing moveGenerationToProject ...
export function moveGenerationToProject(generationId: string, projectId: string | null) {
  const db = getDb();
  db.prepare("UPDATE generations SET project_id = ? WHERE id = ?").run(projectId, generationId);
  if (projectId) {
    db.prepare("UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(projectId);
  }
}

// ── Trash System ──

export function softDelete(table: "chat_sessions" | "generations" | "sessions" | "projects", id: string) {
  const db = getDb();
  db.prepare(`UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
}

export function restore(table: "chat_sessions" | "generations" | "sessions" | "projects", id: string) {
  const db = getDb();
  db.prepare(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`).run(id);
}

export function hardDelete(table: "chat_sessions" | "generations" | "sessions" | "projects", id: string) {
  const db = getDb();

  if (table === "generations") {
    const row = db.prepare("SELECT image_path FROM generations WHERE id = ?").get(id) as { image_path: string } | undefined;
    if (row && row.image_path) {
      const fullPath = path.join(process.cwd(), row.image_path);
      try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
    }
  }

  if (table === "sessions" || table === "projects") {
    const foreignKey = table === "sessions" ? "session_id" : "project_id";
    // Note: If deleting a project permanently, we might want to delete associated generations permanently too.
    // Current logic for deleteProject was only detaching.
    // But Hard Delete implies cleanup.
    if (table === "projects") {
      // If hard deleting project, should we hard delete generations or just detach?
      // Trash semantics usually imply "Delete everything inside".
      // Let's hard delete generations associated with this project that are ALSO in trash? 
      // Or just all of them? 
      // Safe approach: Delete generations associated with this project.
      const gens = db.prepare(`SELECT image_path FROM generations WHERE ${foreignKey} = ?`).all(id) as Array<{ image_path: string }>;
      for (const gen of gens) {
        const fullPath = path.join(process.cwd(), gen.image_path);
        try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
      }
      db.prepare(`DELETE FROM generations WHERE ${foreignKey} = ?`).run(id);
    } else if (table === "sessions") {
      const gens = db.prepare(`SELECT image_path FROM generations WHERE session_id = ?`).all(id) as Array<{ image_path: string }>;
      for (const gen of gens) {
        const fullPath = path.join(process.cwd(), gen.image_path);
        try { fs.unlinkSync(fullPath); } catch { /* ignore */ }
      }
      db.prepare(`DELETE FROM generations WHERE session_id = ?`).run(id);
    }
  }

  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export function getTrashItems() {
  const db = getDb();
  const chats = db.prepare("SELECT id, name, deleted_at FROM chat_sessions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all();
  const generations = db.prepare("SELECT id, prompt, image_path, deleted_at FROM generations WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all();
  const projects = db.prepare("SELECT id, name, description, deleted_at FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all();
  const sessions = db.prepare("SELECT id, name, deleted_at FROM sessions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all();

  return {
    chats: chats.map((c: any) => ({ ...c, type: "chat" })),
    images: generations.map((g: any) => ({ ...g, type: "image", url: `/api/images/${g.image_path.replace("storage/", "")}` })),
    projects: projects.map((p: any) => ({ ...p, type: "project" })),
    sessions: sessions.map((s: any) => ({ ...s, type: "session" })),
  };
}

// ── PromptSave ──

export function getPsFolders() {
  const db = getDb();
  return db.prepare("SELECT * FROM ps_folders ORDER BY created_at ASC").all() as Array<{
    id: string; name: string; created_at: string;
  }>;
}

export function createPsFolder(name: string): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO ps_folders (id, name) VALUES (?, ?)").run(id, name);
  return id;
}

export function updatePsFolder(id: string, name: string) {
  const db = getDb();
  db.prepare("UPDATE ps_folders SET name = ? WHERE id = ?").run(name, id);
}

export function deletePsFolder(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM ps_folders WHERE id = ?").run(id);
}

export function getPsPrompts() {
  const db = getDb();
  return db.prepare("SELECT * FROM ps_prompts ORDER BY sort_order ASC, created_at DESC").all() as Array<{
    id: string; title: string; content: string; folder_id: string | null;
    color: string; is_favorite: number; is_deleted: number;
    created_at: string; updated_at: string; sort_order: number;
  }>;
}

export function createPsPrompt(data: {
  title: string; content: string; folderId: string | null; color: string;
}): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO ps_prompts (id, title, content, folder_id, color) VALUES (?, ?, ?, ?, ?)"
  ).run(id, data.title, data.content, data.folderId, data.color);
  return id;
}

export function updatePsPrompt(id: string, data: {
  title: string; content: string; folderId: string | null; color: string;
  isFavorite?: boolean; isDeleted?: boolean;
}) {
  const db = getDb();
  db.prepare(
    `UPDATE ps_prompts SET title = ?, content = ?, folder_id = ?, color = ?,
     is_favorite = ?, is_deleted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(
    data.title, data.content, data.folderId, data.color,
    data.isFavorite ? 1 : 0, data.isDeleted ? 1 : 0, id
  );
}

export function togglePsPromptFavorite(id: string) {
  const db = getDb();
  db.prepare("UPDATE ps_prompts SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function softDeletePsPrompt(id: string) {
  const db = getDb();
  db.prepare("UPDATE ps_prompts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function restorePsPrompt(id: string) {
  const db = getDb();
  db.prepare("UPDATE ps_prompts SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function hardDeletePsPrompt(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM ps_prompts WHERE id = ?").run(id);
}

export function reorderPsPrompts(orderedIds: string[]) {
  const db = getDb();
  const stmt = db.prepare("UPDATE ps_prompts SET sort_order = ? WHERE id = ?");
  const batch = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => stmt.run(index, id));
  });
  batch(orderedIds);
}

// ── Character Vault ──

export function createCharacter(name: string, description?: string) {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO character_vault (id, name, description) VALUES (?, ?, ?)").run(id, name, description || null);
  return id;
}

export function addCharacterReference(characterId: string, imagePath: string, slotIndex?: number, metadata?: string) {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO character_references (id, character_id, image_path, slot_index, metadata) VALUES (?, ?, ?, ?, ?)")
    .run(id, characterId, imagePath, slotIndex ?? null, metadata || null);
  return id;
}

// ── KanBoard ──

export function createKbBoard(name: string, description?: string, color?: string): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO kb_boards (id, name, description, color) VALUES (?, ?, ?, ?)"
  ).run(id, name, description || null, color || 'bg-amber-500');
  return id;
}

export function getKbBoards() {
  const db = getDb();
  return db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM kb_columns c WHERE c.board_id = b.id) as column_count,
      (SELECT COUNT(*) FROM kb_cards k WHERE k.board_id = b.id) as card_count
    FROM kb_boards b
    ORDER BY b.sort_order ASC, b.created_at DESC
  `).all() as Array<{
    id: string; name: string; description: string | null; color: string;
    is_favorite: number; is_deleted: number; sort_order: number;
    created_at: string; updated_at: string; deleted_at: string | null;
    column_count: number; card_count: number;
  }>;
}

export function getKbBoard(id: string) {
  const db = getDb();
  const board = db.prepare("SELECT * FROM kb_boards WHERE id = ?").get(id) as any;
  if (!board) return null;

  const columns = db.prepare(
    "SELECT * FROM kb_columns WHERE board_id = ? ORDER BY sort_order ASC"
  ).all(id) as any[];

  const cards = db.prepare(
    "SELECT * FROM kb_cards WHERE board_id = ? ORDER BY sort_order ASC"
  ).all(id) as any[];

  const labels = db.prepare(
    "SELECT * FROM kb_labels WHERE board_id = ?"
  ).all(id) as any[];

  const cardLabels = db.prepare(`
    SELECT cl.card_id, cl.label_id FROM kb_card_labels cl
    JOIN kb_cards c ON c.id = cl.card_id WHERE c.board_id = ?
  `).all(id) as Array<{ card_id: string; label_id: string }>;

  return { board, columns, cards, labels, cardLabels };
}

export function updateKbBoard(id: string, data: { name?: string; description?: string; color?: string }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    db.prepare(`UPDATE kb_boards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
}

export function toggleKbBoardFavorite(id: string) {
  const db = getDb();
  db.prepare("UPDATE kb_boards SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function softDeleteKbBoard(id: string) {
  const db = getDb();
  db.prepare("UPDATE kb_boards SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function restoreKbBoard(id: string) {
  const db = getDb();
  db.prepare("UPDATE kb_boards SET is_deleted = 0, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

export function hardDeleteKbBoard(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM kb_boards WHERE id = ?").run(id);
}

// Columns
export function createKbColumn(boardId: string, name: string, color?: string): string {
  const db = getDb();
  const id = uuidv4();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM kb_columns WHERE board_id = ?").get(boardId) as { m: number };
  db.prepare(
    "INSERT INTO kb_columns (id, board_id, name, color, sort_order) VALUES (?, ?, ?, ?, ?)"
  ).run(id, boardId, name, color || null, maxOrder.m + 1);
  return id;
}

export function updateKbColumn(id: string, data: { name?: string; color?: string; wipLimit?: number }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (data.wipLimit !== undefined) { fields.push("wip_limit = ?"); values.push(data.wipLimit); }
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE kb_columns SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
}

export function deleteKbColumn(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM kb_columns WHERE id = ?").run(id);
}

export function reorderKbColumns(orderedIds: string[]) {
  const db = getDb();
  const stmt = db.prepare("UPDATE kb_columns SET sort_order = ? WHERE id = ?");
  const batch = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => stmt.run(index, id));
  });
  batch(orderedIds);
}

// Cards
export function createKbCard(data: { columnId: string; boardId: string; title: string; description?: string; color?: string; priority?: string }): string {
  const db = getDb();
  const id = uuidv4();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM kb_cards WHERE column_id = ?").get(data.columnId) as { m: number };
  db.prepare(
    "INSERT INTO kb_cards (id, column_id, board_id, title, description, color, priority, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, data.columnId, data.boardId, data.title, data.description || null, data.color || null, data.priority || 'none', maxOrder.m + 1);
  return id;
}

export function getKbCard(id: string) {
  const db = getDb();
  const card = db.prepare("SELECT * FROM kb_cards WHERE id = ?").get(id) as any;
  if (!card) return null;
  const checklist = db.prepare("SELECT * FROM kb_checklist WHERE card_id = ? ORDER BY sort_order ASC").all(id) as any[];
  const labels = db.prepare(`
    SELECT l.* FROM kb_labels l
    JOIN kb_card_labels cl ON cl.label_id = l.id
    WHERE cl.card_id = ?
  `).all(id) as any[];
  return { ...card, checklist, labels };
}

export function updateKbCard(id: string, data: {
  title?: string; description?: string; color?: string; priority?: string;
  dueDate?: string | null; isCompleted?: boolean; columnId?: string;
}) {
  const db = getDb();
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
    db.prepare(`UPDATE kb_cards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
}

export function deleteKbCard(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM kb_cards WHERE id = ?").run(id);
}

export function moveKbCard(cardId: string, targetColumnId: string, sortOrder: number) {
  const db = getDb();
  db.prepare("UPDATE kb_cards SET column_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetColumnId, sortOrder, cardId);
}

export function reorderKbCards(columnId: string, orderedIds: string[]) {
  const db = getDb();
  const stmt = db.prepare("UPDATE kb_cards SET sort_order = ?, column_id = ? WHERE id = ?");
  const batch = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => stmt.run(index, columnId, id));
  });
  batch(orderedIds);
}

// Labels
export function createKbLabel(boardId: string, name: string, color: string): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO kb_labels (id, board_id, name, color) VALUES (?, ?, ?, ?)").run(id, boardId, name, color);
  return id;
}

export function updateKbLabel(id: string, data: { name?: string; color?: string }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.color !== undefined) { fields.push("color = ?"); values.push(data.color); }
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE kb_labels SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
}

export function deleteKbLabel(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM kb_labels WHERE id = ?").run(id);
}

export function toggleKbCardLabel(cardId: string, labelId: string) {
  const db = getDb();
  const existing = db.prepare("SELECT 1 FROM kb_card_labels WHERE card_id = ? AND label_id = ?").get(cardId, labelId);
  if (existing) {
    db.prepare("DELETE FROM kb_card_labels WHERE card_id = ? AND label_id = ?").run(cardId, labelId);
  } else {
    db.prepare("INSERT INTO kb_card_labels (card_id, label_id) VALUES (?, ?)").run(cardId, labelId);
  }
}

export function getKbLabels(boardId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM kb_labels WHERE board_id = ?").all(boardId) as Array<{ id: string; board_id: string; name: string; color: string }>;
}

// Checklist
export function createKbChecklistItem(cardId: string, text: string): string {
  const db = getDb();
  const id = uuidv4();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM kb_checklist WHERE card_id = ?").get(cardId) as { m: number };
  db.prepare("INSERT INTO kb_checklist (id, card_id, text, sort_order) VALUES (?, ?, ?, ?)").run(id, cardId, text, maxOrder.m + 1);
  return id;
}

export function updateKbChecklistItem(id: string, data: { text?: string; isChecked?: boolean }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.text !== undefined) { fields.push("text = ?"); values.push(data.text); }
  if (data.isChecked !== undefined) { fields.push("is_checked = ?"); values.push(data.isChecked ? 1 : 0); }
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE kb_checklist SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
}

export function deleteKbChecklistItem(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM kb_checklist WHERE id = ?").run(id);
}

export function toggleKbChecklistItem(id: string) {
  const db = getDb();
  db.prepare("UPDATE kb_checklist SET is_checked = NOT is_checked WHERE id = ?").run(id);
}

export function reorderKbChecklist(orderedIds: string[]) {
  const db = getDb();
  const stmt = db.prepare("UPDATE kb_checklist SET sort_order = ? WHERE id = ?");
  const batch = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => stmt.run(index, id));
  });
  batch(orderedIds);
}

export function getCharacters() {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, COUNT(r.id) as ref_count 
    FROM character_vault c 
    LEFT JOIN character_references r ON r.character_id = c.id 
    GROUP BY c.id 
    ORDER BY c.updated_at DESC
  `).all() as any[];
}

export function getCharacterWithReferences(characterId: string) {
  const db = getDb();
  const character = db.prepare("SELECT * FROM character_vault WHERE id = ?").get(characterId);
  if (!character) return null;
  const references = db.prepare("SELECT * FROM character_references WHERE character_id = ? ORDER BY created_at ASC").all(characterId);
  return { ...character, references } as any;
}


