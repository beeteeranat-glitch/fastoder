import { createServerClient } from "@/lib/supabase/server";

export type LoginRole = "admin" | "rider";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 5 * 60;

type LoginRateLimitRow = {
  failed_attempts: number;
  locked_until: string | null;
};

type MemoryRateLimitRow = {
  failedAttempts: number;
  lockedUntil: number | null;
};

type GlobalWithLoginRateLimits = typeof globalThis & {
  __fastOrderLoginRateLimits?: Map<LoginRole, MemoryRateLimitRow>;
};

function memoryStore() {
  const globalStore = globalThis as GlobalWithLoginRateLimits;
  if (!globalStore.__fastOrderLoginRateLimits) {
    globalStore.__fastOrderLoginRateLimits = new Map();
  }
  return globalStore.__fastOrderLoginRateLimits;
}

function secondsUntil(lockedUntil: string | null) {
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
}

function getMemoryLock(role: LoginRole) {
  const record = memoryStore().get(role);
  if (!record?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((record.lockedUntil - Date.now()) / 1000));
}

function recordMemoryFailure(role: LoginRole) {
  const store = memoryStore();
  const current = store.get(role);
  const isExistingLockActive = Boolean(
    current?.lockedUntil && current.lockedUntil > Date.now(),
  );

  if (isExistingLockActive && current) {
    return {
      failedAttempts: current.failedAttempts,
      retryAfterSeconds: getMemoryLock(role),
    };
  }

  const previousExpired = Boolean(
    current?.lockedUntil && current.lockedUntil <= Date.now(),
  );
  const failedAttempts = previousExpired ? 1 : (current?.failedAttempts ?? 0) + 1;
  const lockedUntil =
    failedAttempts >= MAX_ATTEMPTS
      ? Date.now() + LOCK_DURATION_SECONDS * 1_000
      : null;
  store.set(role, { failedAttempts, lockedUntil });

  return {
    failedAttempts,
    retryAfterSeconds: lockedUntil
      ? Math.ceil((lockedUntil - Date.now()) / 1_000)
      : 0,
  };
}

export async function getLoginLock(role: LoginRole) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("login_rate_limits")
    .select("locked_until")
    .eq("role", role)
    .maybeSingle();

  if (error) return getMemoryLock(role);
  return secondsUntil(data?.locked_until ?? null);
}

export async function recordFailedLogin(role: LoginRole) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("record_login_failure", {
    p_role: role,
  });

  if (error || !data) return recordMemoryFailure(role);

  const row = (Array.isArray(data) ? data[0] : data) as LoginRateLimitRow | undefined;
  if (!row) return recordMemoryFailure(role);

  return {
    failedAttempts: row.failed_attempts,
    retryAfterSeconds: secondsUntil(row.locked_until),
  };
}

export async function clearFailedLogins(role: LoginRole) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("login_rate_limits")
    .delete()
    .eq("role", role);

  if (error) {
    memoryStore().delete(role);
    return;
  }
  memoryStore().delete(role);
}

export const loginRateLimit = {
  maxAttempts: MAX_ATTEMPTS,
  lockDurationSeconds: LOCK_DURATION_SECONDS,
};
