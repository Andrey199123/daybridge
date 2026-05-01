// Simple in-memory rate limiter for Gemini API
// This prevents hitting rate limits by tracking requests per minute

interface RateLimitEntry {
  count: number;
  resetTime: number;
  backoffUntil: number; // Track when we can retry after a 429
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 5, // Very conservative for new API keys (Gemini free tier can be as low as 2-5/min initially)
  windowMs: number = 60000 // 1 minute window
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  // If no entry or window has expired, create new entry
  if (!entry || now >= entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
      backoffUntil: 0
    };
    rateLimitMap.set(identifier, newEntry);
    
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime: newEntry.resetTime
    };
  }
  
  // Check if we're in backoff period (after receiving a 429)
  if (entry.backoffUntil > now) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: entry.backoffUntil
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitMap.set(identifier, entry);
  
  return {
    allowed: true,
    remainingRequests: maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

// Call this when we receive a 429 from Gemini to enforce backoff
export function recordRateLimitHit(identifier: string, backoffSeconds: number = 30): void {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (entry) {
    // Set backoff period - don't allow any requests for backoffSeconds
    entry.backoffUntil = now + (backoffSeconds * 1000);
    // Also max out the count to prevent any more requests this window
    entry.count = 999;
    rateLimitMap.set(identifier, entry);
  } else {
    // Create new entry in backoff state
    rateLimitMap.set(identifier, {
      count: 999,
      resetTime: now + 60000,
      backoffUntil: now + (backoffSeconds * 1000)
    });
  }
  
  console.log(`[RateLimiter] 429 received - backing off for ${backoffSeconds}s until ${new Date(now + backoffSeconds * 1000).toISOString()}`);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetTime && now >= entry.backoffUntil) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute