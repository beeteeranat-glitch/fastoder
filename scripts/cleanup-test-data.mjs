import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
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

const confirmed = process.argv.includes("--confirm");
const dryRun = process.argv.includes("--dry-run") || !confirmed;

const dbUrl = buildDbUrl();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dbUrl && (!supabaseUrl || !serviceRoleKey)) {
  console.error(
    [
      "Missing database connection.",
      "Add SUPABASE_DB_PASSWORD, SUPABASE_DB_URL, DATABASE_URL,",
      "or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    ].join("\n"),
  );
  process.exit(1);
}

const tablesToClean = [
  "customer_otp_codes",
  "reward_redemptions",
  "point_transactions",
  "order_items",
  "orders",
  "customers",
  "referrers",
  "promo_codes",
];

const tablesToKeep = [
  "restaurants",
  "categories",
  "products",
  "toppings",
  "addons",
  "delivery_fee_tiers",
];

const client = dbUrl ? postgres(dbUrl, { max: 1 }) : null;
const supabase =
  !dbUrl && supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

async function tableExists(tableName) {
  if (supabase) {
    const { error } = await supabase.from(tableName).select("id", {
      count: "exact",
      head: true,
    });
    return !error;
  }

  const [row] = await client`
    select to_regclass(${`public.${tableName}`}) is not null as exists
  `;
  return Boolean(row?.exists);
}

async function countRows(tableName) {
  if (supabase) {
    const { count, error } = await supabase.from(tableName).select("id", {
      count: "exact",
      head: true,
    });
    if (error) throw error;
    return count ?? 0;
  }

  const [row] = await client.unsafe(
    `select count(*)::integer as count from public.${tableName}`,
  );
  return row?.count ?? 0;
}

async function deleteAllRows(tableName) {
  const { error } = await supabase.from(tableName).delete().not("id", "is", null);
  if (error) throw error;
}

async function updateAllOrdersRewardRedemptions() {
  const { error } = await supabase
    .from("orders")
    .update({ reward_redemption_id: null })
    .not("id", "is", null);
  if (error) throw error;
}

try {
  const existingCleanTables = [];
  const before = {};
  for (const table of tablesToClean) {
    if (!(await tableExists(table))) continue;
    existingCleanTables.push(table);
    before[table] = await countRows(table);
  }

  console.log(dryRun ? "Dry run: no data deleted." : "Cleaning test data...");
  console.log("\nWill clean:");
  for (const table of existingCleanTables) {
    console.log(`  - ${table}: ${before[table]} row(s)`);
  }

  console.log("\nWill keep:");
  for (const table of tablesToKeep) {
    if (await tableExists(table)) {
      console.log(`  - ${table}: ${await countRows(table)} row(s)`);
    }
  }

  if (dryRun) {
    console.log("\nRun with --confirm to delete the rows listed above.");
    process.exit(0);
  }

  if (client) {
    await client.begin(async (sql) => {
      if (await tableExists("orders")) {
        await sql`update public.orders set reward_redemption_id = null`;
      }

      for (const table of tablesToClean) {
        if (!(await tableExists(table))) continue;
        await sql.unsafe(`delete from public.${table}`);
      }
    });
  } else {
    if (await tableExists("orders")) {
      await updateAllOrdersRewardRedemptions();
    }

    for (const table of tablesToClean) {
      if (!(await tableExists(table))) continue;
      await deleteAllRows(table);
    }
  }

  console.log("\nCleaned:");
  for (const table of existingCleanTables) {
    console.log(`  - ${table}: ${before[table]} -> ${await countRows(table)}`);
  }

  console.log("\nReady to use. Menu, shop settings, and delivery fees were kept.");
} catch (error) {
  console.error("Cleanup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  if (client) await client.end();
}
