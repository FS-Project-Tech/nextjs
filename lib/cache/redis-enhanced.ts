/**
 * Enhanced Redis + Memory Cache
 */

type CacheEntry = {
  data: any
  expires: number
}

const memoryCache = new Map<string, CacheEntry>()
const MEMORY_CACHE_LIMIT = 500
const MEMORY_CACHE_TTL = 5 * 60 * 1000

let redisClient: any = null
let redisConnected = false

/* -------------------------------------------------------------------------- */
/* Redis Init                                                                 */
/* -------------------------------------------------------------------------- */

if (process.env.REDIS_URL && typeof window === "undefined") {
  try {
    const Redis = require("ioredis")

    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    })

    redisClient.on("connect", () => {
      redisConnected = true
      console.log("[Cache] Redis connected")
    })

    redisClient.on("error", () => {
      redisConnected = false
    })

    redisClient.connect().catch(() => {})
  } catch {
    console.warn("[Cache] Redis unavailable")
  }
}

/* -------------------------------------------------------------------------- */
/* TTL                                                                        */
/* -------------------------------------------------------------------------- */

const CACHE_TTL = {
  categories: 60 * 60 * 1000,
  products: 15 * 60 * 1000,
  product: 10 * 60 * 1000,
  search: 5 * 60 * 1000,
  cart: 2 * 60 * 1000,
} as const

type CacheType = keyof typeof CACHE_TTL

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeParams(params?: Record<string, any>) {
  if (!params) return ""

  return Object.keys(params)
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join("|")
}

function cacheKey(type: CacheType, key: string, params?: Record<string, any>) {
  const p = normalizeParams(params)
  return `wc:${type}:${key}${p ? ":" + p : ""}`
}

/* -------------------------------------------------------------------------- */
/* Memory Cache                                                               */
/* -------------------------------------------------------------------------- */

function getMemory(key: string) {
  const entry = memoryCache.get(key)

  if (!entry) return null

  if (Date.now() > entry.expires) {
    memoryCache.delete(key)
    return null
  }

  return entry.data
}

function setMemory(key: string, data: any, ttl: number) {
  if (memoryCache.size >= MEMORY_CACHE_LIMIT) {
    const first = memoryCache.keys().next().value
    memoryCache.delete(first)
  }

  memoryCache.set(key, {
    data,
    expires: Date.now() + ttl,
  })
}

/* -------------------------------------------------------------------------- */
/* Redis Cache                                                                */
/* -------------------------------------------------------------------------- */

async function getRedis(key: string) {
  if (!redisClient || !redisConnected) return null

  try {
    const value = await redisClient.get(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

async function setRedis(key: string, data: any, ttl: number) {
  if (!redisClient || !redisConnected) return

  try {
    await redisClient.set(key, JSON.stringify(data), "PX", ttl)
  } catch {}
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function cacheGet<T>(
  type: CacheType,
  key: string,
  params?: Record<string, any>
): Promise<T | null> {
  const k = cacheKey(type, key, params)

  const mem = getMemory(k)
  if (mem) return mem

  const redis = await getRedis(k)

  if (redis) {
    setMemory(k, redis, MEMORY_CACHE_TTL)
    return redis
  }

  return null
}

export async function cacheSet<T>(
  type: CacheType,
  key: string,
  data: T,
  params?: Record<string, any>
) {
  const k = cacheKey(type, key, params)

  const ttl = CACHE_TTL[type]

  setMemory(k, data, Math.min(ttl, MEMORY_CACHE_TTL))

  await setRedis(k, data, ttl)
}

export async function cacheInvalidate(
  type: CacheType,
  key: string,
  params?: Record<string, any>
) {
  const k = cacheKey(type, key, params)

  memoryCache.delete(k)

  if (redisClient && redisConnected) {
    await redisClient.del(k)
  }
}

export function clearMemoryCache() {
  memoryCache.clear()
}

export async function getCacheStats() {
  return {
    memoryKeys: memoryCache.size,
    redisConnected,
  }
}