import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const migrationsDir = resolve(root, "supabase/migrations");

function loadEnvFile(filename) {
  try {
    const text = readFileSync(resolve(root, filename), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional file
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function projectRefFromSupabaseUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function buildDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref =
    process.env.SUPABASE_PROJECT_REF ??
    projectRefFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!password || !ref) return null;

  const encoded = encodeURIComponent(password);
  return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
}

const dbUrl = buildDbUrl();

if (!dbUrl) {
  console.error(
    [
      "Missing database connection.",
      "",
      "Add ONE of these to .env.local:",
      "  SUPABASE_DB_PASSWORD=your-database-password",
      "  (uses NEXT_PUBLIC_SUPABASE_URL project ref automatically)",
      "",
      "Or full URI:",
      "  SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@...",
      "",
      "Password: Supabase Dashboard → Project Settings → Database",
    ].join("\n"),
  );
  process.exit(1);
}

const migrationsDir = resolve(root, "supabase/migrations");
const archiveDir = resolve(migrationsDir, "archive");

function listMigrationFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => resolve(dir, name));
  } catch {
    return [];
  }
}

const migrationPaths = [
  ...listMigrationFiles(archiveDir),
  ...listMigrationFiles(migrationsDir),
].sort((a, b) => a.localeCompare(b));

if (migrationPaths.length === 0) {
  console.error("No migration files found in supabase/migrations or archive/");
  process.exit(1);
}

const client = postgres(dbUrl, { max: 1 });

try {
  for (const filePath of migrationPaths) {
    const migration = readFileSync(filePath, "utf8");
    await client.unsafe(migration);
    console.log(`Migration applied: ${filePath.replace(root + "\\", "").replace(root + "/", "")}`);
  }

  const tables = await client`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  console.log("\nTables in public schema:");
  for (const row of tables) {
    console.log(`  - ${row.table_name}`);
  }
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
