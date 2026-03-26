import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const WORKSPACE = join(import.meta.dirname, "..", "..");
const DB_PATH = join(WORKSPACE, "eddie.sqlite");

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA busy_timeout = 5000");

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT DEFAULT '',
    location TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    degree TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendiente',
    message_sent TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    region TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source_url TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    content TEXT DEFAULT '',
    brand_name TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    vertical TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    post_number INTEGER NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    published_url TEXT DEFAULT '',
    published_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(date, post_number)
  );

  CREATE TABLE IF NOT EXISTS research_prospects (
    research_id INTEGER NOT NULL REFERENCES research(id) ON DELETE CASCADE,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    PRIMARY KEY (research_id, prospect_id)
  );

  CREATE TABLE IF NOT EXISTS research_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS research_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    niche TEXT NOT NULL,
    competitors TEXT NOT NULL DEFAULT '[]',
    platforms TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    current_step TEXT DEFAULT NULL,
    error TEXT DEFAULT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS research_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS research_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    last_researched_at TEXT
  );
`);

// ── Migrations: add columns safely ──
function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

// content_status migrations
if (!hasColumn("content_status", "body_override")) {
  db.exec("ALTER TABLE content_status ADD COLUMN body_override TEXT DEFAULT NULL");
}
if (!hasColumn("content_status", "approved_at")) {
  db.exec("ALTER TABLE content_status ADD COLUMN approved_at TEXT DEFAULT NULL");
}
if (!hasColumn("content_status", "notes")) {
  db.exec("ALTER TABLE content_status ADD COLUMN notes TEXT DEFAULT ''");
}

if (!hasColumn("prospects", "campaign_id")) {
  db.exec("ALTER TABLE prospects ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)");
}
if (!hasColumn("prospects", "last_followup_at")) {
  db.exec("ALTER TABLE prospects ADD COLUMN last_followup_at TEXT DEFAULT NULL");
}
if (!hasColumn("prospects", "followup_count")) {
  db.exec("ALTER TABLE prospects ADD COLUMN followup_count INTEGER DEFAULT 0");
}

// research migrations
if (!hasColumn("research", "campaign_id")) {
  db.exec("ALTER TABLE research ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)");
}
if (!hasColumn("research", "category")) {
  db.exec("ALTER TABLE research ADD COLUMN category TEXT DEFAULT 'general'");
}

// ── Seed campaigns ──
const campaignCount = db.prepare("SELECT COUNT(*) as n FROM campaigns").get() as { n: number };
if (campaignCount.n === 0) {
  const insertCampaign = db.prepare(
    `INSERT INTO campaigns (name, vertical, description) VALUES (?, ?, ?)`
  );
  const campaignSeeds = [
    ["Logística Argentina", "logistica", "CEOs y directivos de empresas de logística en Argentina"],
    ["Logística Miami", "logistica", "CEOs y directivos de empresas de logística en Miami/USA"],
    ["Odoo Partners AR", "odoo", "Partners y consultoras Odoo en Argentina"],
    ["Odoo Partners USA", "odoo", "Partners y consultoras Odoo en USA/Miami"],
  ];
  for (const row of campaignSeeds) {
    insertCampaign.run(...row);
  }
  // Assign existing prospects to campaigns
  db.exec(`UPDATE prospects SET campaign_id = 1 WHERE region = 'argentina' AND campaign_id IS NULL AND id <= 12`);
  db.exec(`UPDATE prospects SET campaign_id = 2 WHERE region = 'miami' AND campaign_id IS NULL AND id <= 12`);
  db.exec(`UPDATE prospects SET campaign_id = 3 WHERE region = 'argentina' AND campaign_id IS NULL AND id > 12`);
  db.exec(`UPDATE prospects SET campaign_id = 4 WHERE region = 'miami' AND campaign_id IS NULL AND id > 12`);
  console.log(`[Eddie Dashboard] Seeded 4 campaigns and assigned prospects`);
}

// ── Seed prospects (only if empty) ──
const count = db.prepare("SELECT COUNT(*) as n FROM prospects").get() as { n: number };
if (count.n === 0) {
  const insert = db.prepare(
    `INSERT INTO prospects (name, company, role, location, linkedin_url, degree, status, message_sent, region)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const seeds = [
    // Argentina
    ["María González", "LogiTech Express", "CEO", "Buenos Aires, Argentina", "https://linkedin.com/in/example-1", "2°", "pendiente", "Hola María, admiramos lo que construyeron en LogiTech Express. Nos encantaría conectar y explorar sinergias.", "argentina"],
    ["Juan Pérez", "FastShip SA", "CEO", "Buenos Aires, Argentina", "https://linkedin.com/in/example-2", "2°", "aceptada", "Hola Juan, lo que hacen en FastShip SA es muy valioso. Nos encantaría conectar y explorar oportunidades.", "argentina"],
    ["Ana Rodríguez", "TransCargo Buenos Aires", "CEO", "Buenos Aires, Argentina", "", "2°", "pendiente", "", "argentina"],
    ["Roberto Méndez", "Envíos Rápidos SRL", "Dir. Ops e Innovación", "Buenos Aires, Argentina", "https://linkedin.com/in/example-3", "2°", "pendiente", "Hola Roberto, tu rol liderando operaciones e innovación es muy interesante. Me encantaría conectar.", "argentina"],
    ["Lucía Fernández", "UltimaMillaBA", "Founder & CEO", "Buenos Aires, Argentina", "https://linkedin.com/in/example-4", "2°", "pendiente", "Hola Lucía, lo que construyeron en UltimaMillaBA es impresionante. Me encantaría explorar sinergias.", "argentina"],
    ["Diego Herrera", "ConectaLog", "Co-Founder & CEO", "Buenos Aires, Argentina", "https://linkedin.com/in/example-5", "2°", "pendiente", "Hola Diego, lo que hicieron en ConectaLog es muy valioso. Tenemos mucho en común, me encantaría conectar.", "argentina"],
    ["Valentina López", "Correo del Sur", "Presidente-CEO", "Buenos Aires, Argentina", "https://linkedin.com/in/example-6", "2°", "pendiente", "Hola Valentina, la apuesta por modernizar operaciones es clara. Me encantaría explorar sinergias.", "argentina"],
    ["Martín Ríos", "Capital Logístico SA", "CEO", "Buenos Aires, Argentina", "https://linkedin.com/in/example-7", "3°", "pendiente", "Hola Martín, tu visión liderando logística e infraestructura es muy interesante. Me encantaría conectar.", "argentina"],
    ["Sofía Navarro", "DigiTransforma", "Líder", "Buenos Aires, Argentina", "https://linkedin.com/in/example-8", "2°", "pendiente", "Hola Sofía, tu perfil en transformación digital es muy interesante. Me encantaría conectar.", "argentina"],
    // Miami
    ["Carlos Ramírez", "FloridaFreight LLC", "CEO", "Miami, FL", "https://linkedin.com/in/example-9", "2°", "pendiente", "Hi Carlos, what you're building at FloridaFreight is impressive. I'd love to connect and explore synergies.", "miami"],
    ["Elena Vargas", "SupplyBridge Co", "CEO & Co-Founder", "Miami, FL", "https://linkedin.com/in/example-10", "2°", "pendiente", "Hi Elena, what you've built with SupplyBridge is remarkable. I'd love to connect and explore potential synergies.", "miami"],
    ["Andrés Torres", "WarehouseTech Inc", "Sr. Engineering R&D Director", "Fort Lauderdale, FL", "https://linkedin.com/in/example-11", "2°", "pendiente", "Hi Andres, your R&D work at WarehouseTech is fascinating. Would love to connect.", "miami"],
  ];

  for (const row of seeds) {
    insert.run(...row);
  }
  console.log(`[Eddie Dashboard] Seeded ${seeds.length} prospects`);
}

export { WORKSPACE };
