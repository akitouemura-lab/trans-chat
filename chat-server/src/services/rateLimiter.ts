type RateLimitResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      retryAfterMs: number;
    };

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getPositiveNumber(name: string, fallback: number): number {
  const configured = Number(process.env[name]);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return fallback;
}

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function checkRateLimit(
  key: string,
  windowMs: number,
  maxCount: number
): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const existingBucket = buckets.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return { allowed: true };
  }

  if (existingBucket.count >= maxCount) {
    return {
      allowed: false,
      retryAfterMs: existingBucket.resetAt - now
    };
  }

  existingBucket.count += 1;
  return { allowed: true };
}

export function checkMessageRateLimit(
  socketId: string,
  roomId: string
): RateLimitResult {
  const socketWindowMs = getPositiveNumber(
    "MESSAGE_RATE_LIMIT_WINDOW_MS",
    10000
  );
  const socketMax = getPositiveNumber("MESSAGE_RATE_LIMIT_MAX", 5);
  const roomWindowMs = getPositiveNumber("ROOM_RATE_LIMIT_WINDOW_MS", 10000);
  const roomMax = getPositiveNumber("ROOM_RATE_LIMIT_MAX", 30);

  const socketResult = checkRateLimit(
    "socket:" + socketId,
    socketWindowMs,
    socketMax
  );

  if (!socketResult.allowed) return socketResult;

  return checkRateLimit("room:" + roomId, roomWindowMs, roomMax);
}
