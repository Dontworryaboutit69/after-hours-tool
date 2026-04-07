interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetTime) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  identifier: string,
  config: { maxRequests: number; windowSeconds: number }
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + config.windowSeconds * 1000 });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowSeconds };
  }

  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
