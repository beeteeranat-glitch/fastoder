import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

async function runViaManagementApi(ref, token, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text}`);
  }

  return text;
}

const ref =
  process.env.SUPABASE_PROJECT_REF ??
  projectRefFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

const migrationFile =
  process.argv[2] ?? "008_referrers_customers.sql";
const migrationPath = resolve(root, "supabase/migrations", migrationFile);
const sql = readFileSync(migrationPath, "utf8");

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token || !ref) {
  console.error(
    [
      "Missing SUPABASE_ACCESS_TOKEN or project ref.",
      "",
      "1. เปิด https://supabase.com/dashboard/account/tokens",
      "2. สร้าง token แล้วใส่ใน .env.local:",
      "   SUPABASE_ACCESS_TOKEN=sbp_...",
      "3. รัน: npm run db:migrate:008",
    ].join("\n"),
  );
  process.exit(1);
}

try {
  await runViaManagementApi(ref, token, sql);
  console.log(`Migration applied via Management API: ${migrationFile}`);
} catch (error) {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
