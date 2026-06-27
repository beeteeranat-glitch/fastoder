import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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
    // optional
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

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: node scripts/apply-single-migration.mjs <file.sql>");
  process.exit(1);
}

const dbUrl = buildDbUrl();
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

function resolveMigrationPath(fileName) {
  const candidates = [
    resolve(root, "supabase/migrations", fileName),
    resolve(root, "supabase/migrations/archive", fileName),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

const migrationPath = resolveMigrationPath(migrationFile);
if (!migrationPath) {
  console.error(`Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sql = readFileSync(migrationPath, "utf8");

const client = postgres(dbUrl, { max: 1 });

try {
  await client.unsafe(sql);
  console.log(`Migration applied: ${migrationFile}`);
} catch (error) {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
} finally {
  await client.end();
}
