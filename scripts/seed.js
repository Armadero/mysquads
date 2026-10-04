/**
 * MySquads — Seed Script
 *
 * Uso:
 *   node scripts/seed.js [--truncate] [--reset] [--seed-only]
 *
 * Opções:
 *   (nenhuma)     Inicializa tabelas + insere registros padrão (idempotente)
 *   --truncate    Apaga TODOS os dados (DELETE) e reinsere os registros padrão
 *   --reset       Dropa e recria TODAS as tabelas, depois insere os registros padrão
 *   --seed-only   Apenas insere os registros padrão (não toca no schema)
 *   --help        Exibe esta ajuda
 *
 * Ver seed.md para documentação completa.
 */

const path  = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

// ─── Config ───────────────────────────────────────────────────────────────────

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db");

const DEFAULT_COORDINATOR = {
  email:    "admin@mysquads.com",
  password: "admin123",
  name:     "Admin",
  type:     "COORDINATOR",
};

const ROLES_TEMPLATE = [
  { name: "SCRUM_MASTER",   defaultColor: "#7C3AED", qtyPerSquad: 1, maxSquads: 2, multipleSquads: 1, order: 1 },
  { name: "SYSTEM_ANALYST", defaultColor: "#2563EB", qtyPerSquad: 1, maxSquads: 2, multipleSquads: 1, order: 2 },
  { name: "DEVELOPER",      defaultColor: "#16A34A", qtyPerSquad: 1, maxSquads: 1, multipleSquads: 0, order: 3 },
  { name: "QA_ANALYST",     defaultColor: "#EA580C", qtyPerSquad: 1, maxSquads: 2, multipleSquads: 1, order: 4 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const CREATE_TABLES_SQL = `
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
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    email            TEXT,
    matricula        TEXT UNIQUE,
    address          TEXT,
    deliveryAddress  TEXT,
    photoUrl         TEXT,
    admissionDate    TEXT NOT NULL,
    birthDate        TEXT,
    resignationDate  TEXT,
    hasChildren      INTEGER NOT NULL DEFAULT 0,
    whatsapp         TEXT,
    contractType     TEXT NOT NULL DEFAULT 'CLT',
    seniority        TEXT NOT NULL DEFAULT 'JUNIOR',
    devType          TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    roleId           INTEGER NOT NULL REFERENCES Role(id) ON DELETE RESTRICT,
    coordinatorId    INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
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
    type           TEXT NOT NULL DEFAULT 'NEUTRAL',
    origin         TEXT NOT NULL DEFAULT 'PERIODIC',
    collaboratorId INTEGER NOT NULL REFERENCES Collaborator(id) ON DELETE CASCADE,
    coordinatorId  INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ManagerCoordinatorLink (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    managerId     INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    coordinatorId INTEGER NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'PENDING',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(managerId, coordinatorId)
  );

  CREATE INDEX IF NOT EXISTS idx_collaborator_coordinator ON Collaborator(coordinatorId);
  CREATE INDEX IF NOT EXISTS idx_squad_coordinator        ON Squad(coordinatorId);
  CREATE INDEX IF NOT EXISTS idx_role_coordinator         ON Role(coordinatorId);
  CREATE INDEX IF NOT EXISTS idx_timebank_collaborator    ON TimeBankEntry(collaboratorId);
  CREATE INDEX IF NOT EXISTS idx_feedback_coordinator     ON Feedback(coordinatorId);
`;

// Ordem inversa de dependência para DROP
const DROP_TABLES_SQL = `
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
`;

// Truncate na ordem inversa (respeita FK)
const TRUNCATE_TABLES_SQL = `
  DELETE FROM ManagerCoordinatorLink;
  DELETE FROM Feedback;
  DELETE FROM TimeBankEntry;
  DELETE FROM IntegrationEventCollaborator;
  DELETE FROM IntegrationEvent;
  DELETE FROM SquadCollaborator;
  DELETE FROM Squad;
  DELETE FROM Collaborator;
  DELETE FROM Role;
  DELETE FROM User;
  DELETE FROM sqlite_sequence;
`;

// ─── Operações ────────────────────────────────────────────────────────────────

function initTables(db) {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(CREATE_TABLES_SQL);
  console.log("   ✅ Tabelas inicializadas");
}

function resetTables(db) {
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(DROP_TABLES_SQL);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(CREATE_TABLES_SQL);
  console.log("   ✅ Tabelas recriadas do zero");
}

function truncateTables(db) {
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(TRUNCATE_TABLES_SQL);
  db.exec("PRAGMA foreign_keys = ON;");
  console.log("   ✅ Todos os dados apagados (tabelas mantidas)");
}

async function insertDefaults(db) {
  // Coordenador padrão
  let coordinator = db.prepare(
    "SELECT id, email FROM User WHERE type = 'COORDINATOR' LIMIT 1"
  ).get();

  if (!coordinator) {
    console.log(`\n👤 Criando coordenador padrão "${DEFAULT_COORDINATOR.email}"...`);
    const hash = await bcrypt.hash(DEFAULT_COORDINATOR.password, 12);
    const result = db.prepare(
      `INSERT INTO User (email, password, name, type) VALUES (?, ?, ?, ?)`
    ).run(DEFAULT_COORDINATOR.email, hash, DEFAULT_COORDINATOR.name, DEFAULT_COORDINATOR.type);
    coordinator = { id: result.lastInsertRowid, email: DEFAULT_COORDINATOR.email };
    console.log(`   ✅ Coordenador criado (id=${coordinator.id})`);
  } else {
    console.log(`\n👤 Coordenador existente: ${coordinator.email} (id=${coordinator.id})`);
  }

  // Cargos para todos os coordenadores
  const coordinators = db.prepare(
    "SELECT id, email FROM User WHERE type = 'COORDINATOR'"
  ).all();

  for (const coord of coordinators) {
    console.log(`\n📋 Cargos → ${coord.email}:`);
    for (const role of ROLES_TEMPLATE) {
      const exists = db.prepare(
        "SELECT id FROM Role WHERE coordinatorId = ? AND name = ?"
      ).get(coord.id, role.name);

      if (exists) {
        console.log(`   ⏭  ${role.name} já existe`);
      } else {
        db.prepare(
          `INSERT INTO Role (name, defaultColor, qtyPerSquad, maxSquads, multipleSquads, "order", coordinatorId)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(role.name, role.defaultColor, role.qtyPerSquad, role.maxSquads,
              role.multipleSquads, role.order, coord.id);
        const squadsLabel = `max ${role.maxSquads} squad${role.maxSquads > 1 ? "s" : ""}`;
        console.log(`   ✅ ${role.name} (ordem ${role.order}, ${squadsLabel})`);
      }
    }
  }

  return coordinators;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const HELP = `
MySquads Seed Script
────────────────────
Uso: node scripts/seed.js [opção]

Opções:
  (nenhuma)     Inicializa tabelas + insere registros padrão (idempotente)
  --truncate    Apaga TODOS os dados e reinsere os registros padrão
  --reset       Dropa e recria TODAS as tabelas, depois insere os registros padrão
  --seed-only   Apenas insere os registros padrão (não toca no schema)
  --help        Exibe esta ajuda

Banco: ${DB_PATH}
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(HELP);
    return;
  }

  const doReset    = args.includes("--reset");
  const doTruncate = args.includes("--truncate");
  const seedOnly   = args.includes("--seed-only");

  console.log("╔══════════════════════════════════════╗");
  console.log("║        MySquads — Seed Script        ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`\n📁 Banco: ${DB_PATH}\n`);

  const db = new DatabaseSync(DB_PATH);

  if (doReset) {
    console.log("♻️  Modo RESET — recriando todas as tabelas...");
    resetTables(db);
  } else if (doTruncate) {
    console.log("🗑️  Modo TRUNCATE — apagando todos os dados...");
    truncateTables(db);
  } else if (seedOnly) {
    console.log("🌱 Modo SEED-ONLY — inserindo registros padrão...");
  } else {
    console.log("🌱 Modo padrão — inicializando tabelas...");
    initTables(db);
  }

  const coordinators = await insertDefaults(db);
  db.close();

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║           Seed concluído! ✅          ║");
  console.log("╚══════════════════════════════════════╝");

  // Exibe credenciais padrão se o coordenador padrão for o único
  if (coordinators.length === 1 && coordinators[0].email === DEFAULT_COORDINATOR.email) {
    console.log("\n  Login padrão:");
    console.log(`  Email : ${DEFAULT_COORDINATOR.email}`);
    console.log(`  Senha : ${DEFAULT_COORDINATOR.password}\n`);
  }
}

main().catch((err) => {
  console.error("\n❌ Erro no seed:", err.message || err);
  process.exit(1);
});
