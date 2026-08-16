export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<void> {
  const storage = useStorage("rate-limits");
  const { limit, windowMs, keyPrefix = "rate-limit" } = config;

  const storageKey = `${keyPrefix}:${key}`;
  const now = Date.now();

  const raw = await storage.getItem(storageKey);
  let entry: RateLimitEntry | null =
    typeof raw === "object" && raw !== null ? (raw as RateLimitEntry) : null;

  // Reset the counter once the window has elapsed
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + windowMs };
  }

  if (entry.count >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "Rate limit exceeded. Please try again later.",
    });
  }

  entry.count += 1;
  await storage.setItem(storageKey, entry);

  // Opportunistically prune expired entries so storage stays bounded
  // (the default memory driver has no per-key TTL). ~5% of requests.
  if (Math.random() < 0.05) {
    await pruneExpiredEntries(storage, keyPrefix);
  }
}

async function pruneExpiredEntries(
  storage: ReturnType<typeof useStorage>,
  keyPrefix: string,
) {
  const now = Date.now();
  const keys = await storage.getKeys();

  await Promise.all(
    keys.map(async (k) => {
      if (!k.startsWith(keyPrefix)) return;
      const raw = await storage.getItem(k);
      const entry =
        typeof raw === "object" && raw !== null
          ? (raw as RateLimitEntry)
          : null;
      if (!entry || entry.expiresAt <= now) {
        await storage.removeItem(k);
      }
    }),
  );
}

export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  EMAIL_VERIFICATION: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 requests per hour
  REGISTRATION: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 registrations per hour per IP
} as const;

/**
 * Resolve the client IP for rate limiting.
 *
 * Forwarded headers (`x-forwarded-for`, `x-real-ip`) are attacker-controlled and
 * are only honored when `NUXT_TRUST_PROXY=true` — i.e. when the server is known
 * to run behind a reverse proxy that sets/overwrites them. Otherwise the socket
 * remote address is used, so the header cannot be spoofed to bypass limits.
 */
export function getClientIP(event: any): string {
  // Platforms (Vercel, Cloudflare, ...) may provide a trusted client address
  if (event.context?.clientAddress) {
    return event.context.clientAddress;
  }

  if (process.env.NUXT_TRUST_PROXY === "true") {
    const forwarded = getHeader(event, "x-forwarded-for");
    const firstHop = forwarded?.split(",")[0]?.trim();
    if (firstHop) {
      // Leftmost entry is the original client, appended by each proxy
      return firstHop;
    }
    const realIp = getHeader(event, "x-real-ip");
    if (realIp) {
      return realIp;
    }
  }

  return event.node?.req?.socket?.remoteAddress || "unknown";
}
