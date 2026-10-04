/**
 * SQLite database module using Node.js built-in node:sqlite (Node 22+)
 * Provides a singleton database connection and helper utilities.
 *
 * We use `process.getBuiltinModule()` (Node 22.3+) which loads built-in
 * modules directly from the Node runtime, completely bypassing any bundler
 * (Turbopack, Webpack) module resolution. This is the only approach that
 * works reliably with Next.js 16 + Turbopack for node:* protocol modules.
 */
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import path from "path";

// process.getBuiltinModule is Node 22.3+ — not in @types/node for all versions
const getBuiltin = (process as unknown as {
  getBuiltinModule: (id: string) => unknown;
}).getBuiltinModule;

const { DatabaseSync } = getBuiltin("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncType;
};

// Resolve DB path relative to project root
const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), "dev.db");

// Singleton instance
let _db: DatabaseSyncType | null = null;

export function getDb(): DatabaseSyncType {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL;");
    _db.exec("PRAGMA foreign_keys = ON;");
    initSchema(_db);
  }
  // Always run incremental migrations (idempotent: only alters if column is missing)
  applyIncrementalMigrations(_db);
  return _db;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

function needsMigration(db: DatabaseSyncType): boolean {
  try {
    // Check if User table exists and has the expected 'created_at' column
    const cols = db.prepare("PRAGMA table_info(User)").all() as Array<{ name: string }>;
    if (cols.length === 0) return false; // Table doesn't exist yet — fresh DB, no migration needed
    return !cols.some((c) => c.name === "created_at");
  } catch {
    return false;
  }
}

function applyIncrementalMigrations(db: DatabaseSyncType) {
  // Migration: add individual address fields and sexo if they don't exist
  const collabCols = db.prepare("PRAGMA table_info(Collaborator)").all() as Array<{ name: string }>;
  const colNames = collabCols.map((c) => c.name);

  const newCols: [string, string][] = [
    ["cep_residencia", "TEXT"],
    ["logradouro_residencia", "TEXT"],
    ["numero_residencia", "TEXT"],
    ["complemento_residencia", "TEXT"],
    ["bairro_residencia", "TEXT"],
    ["cidade_residencia", "TEXT"],
    ["estado_residencia", "TEXT"],
    ["cep_entrega", "TEXT"],
    ["logradouro_entrega", "TEXT"],
    ["numero_entrega", "TEXT"],
    ["complemento_entrega", "TEXT"],
    ["bairro_entrega", "TEXT"],
    ["cidade_entrega", "TEXT"],
    ["estado_entrega", "TEXT"],
    ["sexo", "TEXT"],
    ["cpf", "TEXT"],
  ];

  for (const [col, type] of newCols) {
    if (!colNames.includes(col)) {
      db.exec(`ALTER TABLE Collaborator ADD COLUMN ${col} ${type};`);
    }
  }
}

function dropAllTables(db: DatabaseSyncType) {
  // Disable FK checks temporarily so we can drop in any order
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(`
    DROP TABLE IF EXISTS GiftCampaignCollaborator;
    DROP TABLE IF EXISTS GiftCampaignGift;
    DROP TABLE IF EXISTS GiftCampaign;
    DROP TABLE IF EXISTS Gift;
    DROP TABLE IF EXISTS ManagerCoordinatorLink;
    DROP TABLE IF EXISTS Feedback;
    DROP TABLE IF EXISTS TimeBankEntry;
    DROP TABLE IF EXISTS IntegrationEventCollaborator;
    DROP TABLE IF EXISTS IntegrationEvent;
    DROP TABLE IF EXISTS SquadCollaborator;
    DROP TABLE IF EXISTS Squad;
    DROP TABLE IF EXISTS Collaborator;
    DROP TABLE IF EXISTS Role;
    DROP TABLE IF EXISTS User;
  `);
  db.exec("PRAGMA foreign_keys = ON;");
}

function initSchema(db: DatabaseSyncType) {
  // If the existing DB has an incompatible schema, wipe and recreate
  if (needsMigration(db)) {
    console.log("[db] Incompatible schema detected — dropping all tables and recreating...");
    dropAllTables(db);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      type        TEXT NOT NULL CHECK (type IN ('COORDINATOR','MANAGER')),
      name        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Role (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      defaultColor   TEXT NOT NULL DEFAULT '#cccccc',
      qtyPerSquad    INTEGER NOT NULL DEFAULT 1,
      maxSquads      INTEGER NOT NULL DEFAULT 1,
      multipleSquads INTEGER NOT NULL DEFAULT 0,
      "order"        INTEGER NOT NULL DEFAULT 0,
      coordinatorId  INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Collaborator (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      name                    TEXT NOT NULL,
      email                   TEXT,
      matricula               TEXT UNIQUE,
      address                 TEXT,
      deliveryAddress         TEXT,
      photoUrl                TEXT,
      admissionDate           TEXT NOT NULL,
      birthDate               TEXT,
      resignationDate         TEXT,
      hasChildren             INTEGER NOT NULL DEFAULT 0,
      whatsapp                TEXT,
      contractType            TEXT NOT NULL DEFAULT 'CLT' CHECK (contractType IN ('CLT','THIRD_PARTY')),
      seniority               TEXT NOT NULL DEFAULT 'JUNIOR' CHECK (seniority IN ('JUNIOR','PLENO','SENIOR','SPECIALIST')),
      devType                 TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
      roleId                  INTEGER NOT NULL REFERENCES Role(id) ON DELETE RESTRICT,
      coordinatorId           INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      cep_residencia          TEXT,
      logradouro_residencia   TEXT,
      numero_residencia       TEXT,
      complemento_residencia  TEXT,
      bairro_residencia       TEXT,
      cidade_residencia       TEXT,
      estado_residencia       TEXT,
      cep_entrega             TEXT,
      logradouro_entrega      TEXT,
      numero_entrega          TEXT,
      complemento_entrega     TEXT,
      bairro_entrega          TEXT,
      cidade_entrega          TEXT,
      estado_entrega          TEXT,
      sexo                    TEXT,
      cpf                     TEXT,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Squad (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      jiraLink       TEXT,
      confluenceLink TEXT,
      sprintStart    TEXT,
      sprintDays     INTEGER NOT NULL DEFAULT 14,
      coordinatorId  INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS SquadCollaborator (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      squadId        INTEGER NOT NULL REFERENCES Squad(id) ON DELETE CASCADE,
      collaboratorId INTEGER NOT NULL REFERENCES Collaborator(id) ON DELETE CASCADE,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(squadId, collaboratorId)
    );

    CREATE TABLE IF NOT EXISTS IntegrationEvent (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT,
      startDate     TEXT NOT NULL,
      endDate       TEXT NOT NULL,
      coordinatorId INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS IntegrationEventCollaborator (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId        INTEGER NOT NULL REFERENCES IntegrationEvent(id) ON DELETE CASCADE,
      collaboratorId INTEGER NOT NULL REFERENCES Collaborator(id) ON DELETE CASCADE,
      UNIQUE(eventId, collaboratorId)
    );

    CREATE TABLE IF NOT EXISTS TimeBankEntry (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT NOT NULL,
      expirationDate TEXT NOT NULL,
      balanceHours   REAL NOT NULL,
      collaboratorId INTEGER NOT NULL REFERENCES Collaborator(id) ON DELETE CASCADE,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Feedback (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT NOT NULL,
      content        TEXT NOT NULL,
      tag            TEXT,
      type           TEXT NOT NULL DEFAULT 'NEUTRAL' CHECK (type IN ('POSITIVE','NEGATIVE','NEUTRAL')),
      origin         TEXT NOT NULL DEFAULT 'PERIODIC' CHECK (origin IN ('COLLABORATOR_REQUEST','PERIODIC','PEER_REQUEST','CONFLICT')),
      collaboratorId INTEGER NOT NULL REFERENCES Collaborator(id) ON DELETE CASCADE,
      coordinatorId  INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Gift (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      description   TEXT,
      coordinatorId INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS GiftCampaign (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      description   TEXT,
      coordinatorId INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS GiftCampaignGift (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL REFERENCES GiftCampaign(id) ON DELETE CASCADE,
      giftId     INTEGER NOT NULL REFERENCES Gift(id) ON DELETE CASCADE,
      UNIQUE(campaignId, giftId)
    );

    CREATE TABLE IF NOT EXISTS GiftCampaignCollaborator (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId     INTEGER NOT NULL REFERENCES GiftCampaign(id) ON DELETE CASCADE,
      collaboratorId INTEGER NOT NULL REFERENCES Collaborator(id) ON DELETE CASCADE,
      sent           INTEGER NOT NULL DEFAULT 0,
      sentAt         TEXT,
      UNIQUE(campaignId, collaboratorId)
    );

    CREATE TABLE IF NOT EXISTS ManagerCoordinatorLink (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      managerId     INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      coordinatorId INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
      status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(managerId, coordinatorId)
    );

    CREATE INDEX IF NOT EXISTS idx_collaborator_coordinator ON Collaborator(coordinatorId);
    CREATE INDEX IF NOT EXISTS idx_squad_coordinator        ON Squad(coordinatorId);
    CREATE INDEX IF NOT EXISTS idx_role_coordinator         ON Role(coordinatorId);
    CREATE INDEX IF NOT EXISTS idx_timebank_collaborator    ON TimeBankEntry(collaboratorId);
    CREATE INDEX IF NOT EXISTS idx_timebank_expiration      ON TimeBankEntry(expirationDate);
    CREATE INDEX IF NOT EXISTS idx_feedback_collaborator    ON Feedback(collaboratorId);
    CREATE INDEX IF NOT EXISTS idx_feedback_coordinator     ON Feedback(coordinatorId);
  `);

  // Apply incremental migrations for existing databases
  applyIncrementalMigrations(db);
}

// ─── Query helpers ────────────────────────────────────────────────────────────

type SQLiteParam = null | number | bigint | string | Uint8Array;

/** Run a prepared SELECT and return all rows */
export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: SQLiteParam[] = []
): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

/** Run a prepared SELECT and return the first row or null */
export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: SQLiteParam[] = []
): T | null {
  const db = getDb();
  const stmt = db.prepare(sql);
  return (stmt.get(...params) as T) ?? null;
}

/** Run a prepared INSERT / UPDATE / DELETE */
export function execute(
  sql: string,
  params: SQLiteParam[] = []
): { changes: number; lastInsertRowid: number | bigint } {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/** Run multiple statements in a single transaction */
export function transaction(fn: (db: DatabaseSyncType) => void): void {
  const db = getDb();
  db.exec("BEGIN");
  try {
    fn(db);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
