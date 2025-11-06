/**
 * Rate Limiting Middleware
 * 
 * Implements token bucket algorithm for API rate limiting.
 * Prevents abuse and ensures fair usage of API endpoints.
 */

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Optional message to return when rate limit is exceeded
   */
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Get client identifier from request
 * Uses IP address or falls back to a default identifier
 */
function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  
  // Use the first available IP
  const ip = cfConnectingIp || realIp || forwarded?.split(",")[0] || "unknown";
  
  return ip.trim();
}

/**
 * Rate limit middleware
 * 
 * @param config - Rate limit configuration
 * @returns Object with isAllowed flag and remaining requests
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, message } = config;

  return function checkRateLimit(request: Request): {
    isAllowed: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
  } {
    const identifier = getClientIdentifier(request);
    const now = Date.now();
    const key = `${identifier}:${request.url}`;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    // Reset if window has expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Check if limit exceeded
    const isAllowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);

    return {
      isAllowed,
      remaining,
      resetTime: entry.resetTime,
      message: isAllowed ? undefined : (message || "Rate limit exceeded"),
    };
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict: 10 requests per minute
   * Use for sensitive endpoints (auth, payments, etc.)
   */
  strict: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many requests. Please try again in a minute.",
  },

  /**
   * Standard: 60 requests per minute
   * Use for most API endpoints
   */
  standard: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    message: "Rate limit exceeded. Please slow down your requests.",
  },

  /**
   * Relaxed: 120 requests per minute
   * Use for public read-only endpoints
   */
  relaxed: {
    maxRequests: 120,
    windowMs: 60 * 1000, // 1 minute
    message: "Rate limit exceeded. Please try again shortly.",
  },

  /**
   * Burst: 30 requests per 10 seconds
   * Use for endpoints that might receive bursts of traffic
   */
  burst: {
    maxRequests: 30,
    windowMs: 10 * 1000, // 10 seconds
    message: "Too many requests in a short time. Please wait a moment.",
  },
};

/**
 * Helper function to create rate limit response
 */
export function createRateLimitResponse(
  result: ReturnType<ReturnType<typeof rateLimit>>,
  status: number = 429
): Response {
  const resetDate = new Date(result.resetTime);
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: result.message || "Rate limit exceeded",
      retryAfter,
      resetTime: resetDate.toISOString(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "60", // This should be dynamic based on config
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": resetDate.toISOString(),
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: Response,
  result: ReturnType<ReturnType<typeof rateLimit>>
): Response {
  const resetDate = new Date(result.resetTime);
  
  // Clone response to add headers
  const newResponse = new Response(response.body, response);
  
  newResponse.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  newResponse.headers.set("X-RateLimit-Reset", resetDate.toISOString());
  
  return newResponse;
}

/**
 * Example usage in API route:
 * 
 * ```typescript
 * import { rateLimit, RateLimitPresets, createRateLimitResponse, addRateLimitHeaders } from '@/lib/middleware/rate-limit';
 * 
 * export async function GET(request: Request) {
 *   const limiter = rateLimit(RateLimitPresets.standard);
 *   const result = limiter(request);
 *   
 *   if (!result.isAllowed) {
 *     return createRateLimitResponse(result);
 *   }
 *   
 *   // Your API logic here
 *   const response = NextResponse.json({ data: 'your data' });
 *   
 *   return addRateLimitHeaders(response, result);
 * }
 * ```
 */

