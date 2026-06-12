import "dotenv/config";
import pg from "pg";
import * as redis from "redis";
import { RoastProfile } from "./src/types";

const { Pool } = pg;

// Connection variables
let pgPool: pg.Pool | null = null;
let redisClient: any = null;

let isPgHealthy = false;
let isRedisHealthy = false;
let isRedisDisabled = false;
let hasWarnedRedisMissingConfig = false;

function normalizePgConnectionString(raw: string): string {
  try {
    const parsed = new URL(raw);
    const sslMode = parsed.searchParams.get("sslmode");
    const hasCompatFlag = parsed.searchParams.has("uselibpqcompat");

    if (
      sslMode &&
      ["prefer", "require", "verify-ca"].includes(sslMode) &&
      !hasCompatFlag
    ) {
      parsed.searchParams.set("uselibpqcompat", "true");
      return parsed.toString();
    }
  } catch {
    // If parsing fails, keep the original value and let pg handle it.
  }

  return raw;
}

// Initialize Postgres Pool lazily
export async function getPgPool(): Promise<pg.Pool | null> {
  if (pgPool) return pgPool;

  const rawConnectionString = process.env.DATABASE_URL;
  const connectionString = rawConnectionString ? normalizePgConnectionString(rawConnectionString) : undefined;
  const hasParams = process.env.PGHOST || process.env.PGUSER || process.env.PGPASSWORD || process.env.PGDATABASE;

  if (!connectionString && !hasParams) {
    console.warn("⚠️ Postgres connection details missing in .env (DATABASE_URL not set). Running with IN-MEMORY fallback.");
    return null;
  }

  try {
    const config: pg.PoolConfig = connectionString 
      ? { 
          connectionString, 
          ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech") 
            ? { rejectUnauthorized: false } 
            : undefined 
        }
      : {
          host: process.env.PGHOST,
          port: parseInt(process.env.PGPORT || "5432"),
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
        };

    pgPool = new Pool(config);

    // Test the PostgreSQL connection
    const client = await pgPool.connect();
    console.log("✅ Postgres connection established successfully.");
    isPgHealthy = true;

    // Automating Database Setup: Ensure Schema/Table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS roasted_users (
        username VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT NOT NULL,
        bio TEXT,
        repos_count INT NOT NULL DEFAULT 0,
        followers_count INT NOT NULL DEFAULT 0,
        following_count INT NOT NULL DEFAULT 0,
        joined_year VARCHAR(10) NOT NULL,
        grade VARCHAR(10) NOT NULL,
        grade_title VARCHAR(255) NOT NULL,
        grade_explanation TEXT NOT NULL,
        roast_bullets TEXT[] NOT NULL DEFAULT '{}',
        scores JSONB NOT NULL,
        languages JSONB NOT NULL,
        radar_roast TEXT,
        segment_roast TEXT,
        comparison_roast TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    console.log("✅ Postgres roasted_users schema verified.");
  } catch (error: any) {
    console.error("❌ Postgres Connection Error. Running with IN-MEMORY fallback.", error.message);
    pgPool = null;
    isPgHealthy = false;
  }

  return pgPool;
}

// Initialize Redis Client lazily
export async function getRedisClient(): Promise<any> {
  if (isRedisDisabled) return null;
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    if (!hasWarnedRedisMissingConfig) {
      console.warn("⚠️ Redis credentials missing in .env (REDIS_URL not set). Running without Redis caching.");
      hasWarnedRedisMissingConfig = true;
    }
    isRedisDisabled = true;
    return null;
  }

  try {
    // Dynamic Reconnection Strategy: Instead of returning false and stopping, we reconnect automatically.
    // Exponential backoff, capping at 3 seconds, so idle socket drop heals seamlessly.
    const reconnectStrategy = (retries: number) => {
      if (retries > 15) {
        console.error("❌ Redis reconnection attempts exhausted. Disabling caching.");
        isRedisHealthy = false;
        isRedisDisabled = true;
        return new Error("Redis reconnection attempts exhausted");
      }
      return Math.min(retries * 100, 3000);
    };

    const options = redisUrl
      ? { 
          url: redisUrl, 
          socket: { reconnectStrategy } 
        }
      : {
          socket: {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            reconnectStrategy,
          },
          password: process.env.REDIS_PASSWORD || undefined,
        };

    redisClient = redis.createClient(options);

    redisClient.on("error", (err: any) => {
      // Gentle logs for routine idle socket terminations (Extremely common in Upstash)
      if (err.message && err.message.includes("Socket closed unexpectedly")) {
        console.log("ℹ️ Redis idle socket closed by remote host (expected Upstash behavior). Client will reconnect on next command.");
        return;
      }
      
      console.warn("⚠️ Redis client error:", err.message);
    });

    redisClient.on("end", () => {
      console.log("ℹ️ Redis socket connection ended gracefully.");
    });

    await redisClient.connect();
    console.log("✅ Redis connection established successfully.");
    isRedisHealthy = true;
  } catch (error: any) {
    console.error("❌ Redis Connection Error. Running without Redis caching.", error.message);
    redisClient = null;
    isRedisHealthy = false;
    isRedisDisabled = true;
  }

  return redisClient;
}

// Check database connection states
export function getDbStatus() {
  return {
    postgres: isPgHealthy ? "CONNECTED" : "FALLBACK_TO_MEMORY",
    redis: isRedisHealthy ? "CONNECTED" : "DISABLED"
  };
}

// Retrieve from caching layer (Redis)
export async function getFromCache(username: string): Promise<RoastProfile | null> {
  try {
    const client = await getRedisClient();
    if (!client || !isRedisHealthy) return null;

    const key = `roast:${username.toLowerCase().trim()}`;
    const value = await client.get(key);
    if (value) {
      console.log(`🚀 Cache HIT in Redis for user: ${username}`);
      return JSON.parse(value);
    }
  } catch (err: any) {
    console.warn("⚠️ Redis get operation failed:", err.message);
  }
  return null;
}

// Safe set cache item in Redis with 1 Hour TTL
export async function setInCache(username: string, profile: RoastProfile): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client || !isRedisHealthy) return;

    const key = `roast:${username.toLowerCase().trim()}`;
    const expirationSeconds = 3600; // 1 hour TTL
    await client.setEx(key, expirationSeconds, JSON.stringify(profile));
    console.log(`💾 Cached roast in Redis for user: ${username} (TTL: 1h)`);
  } catch (err: any) {
    console.warn("⚠️ Redis setEx operation failed:", err.message);
  }
}

// Retrieve from PostgreSQL Database
export async function getFromDB(username: string): Promise<RoastProfile | null> {
  try {
    const pool = await getPgPool();
    if (!pool || !isPgHealthy) return null;

    const cleanUsername = username.toLowerCase().trim();
    const result = await pool.query("SELECT * FROM roasted_users WHERE username = $1", [cleanUsername]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`📁 Database HIT in Postgres for user: ${username}`);
      return {
        username: row.username,
        name: row.name,
        avatarUrl: row.avatar_url,
        bio: row.bio || "",
        reposCount: row.repos_count,
        followersCount: row.followers_count,
        followingCount: row.following_count,
        joinedYear: row.joined_year,
        grade: row.grade,
        gradeTitle: row.grade_title,
        gradeExplanation: row.grade_explanation,
        roastBullets: row.roast_bullets,
        scores: row.scores,
        languages: row.languages,
        radarRoast: row.radar_roast || "",
        segmentRoast: row.segment_roast || "",
        comparisonRoast: row.comparison_roast || "",
      };
    }
  } catch (error: any) {
    console.error(`❌ PostgreSQL SELECT failed for user ${username}:`, error.message);
  }
  return null;
}

// Save/Upsert raw profile into Postgres database
export async function saveToDB(profile: RoastProfile): Promise<void> {
  try {
    const pool = await getPgPool();
    if (!pool || !isPgHealthy) return;

    const cleanUsername = profile.username.toLowerCase().trim();
    const query = `
      INSERT INTO roasted_users (
        username, name, avatar_url, bio, repos_count, followers_count, following_count, 
        joined_year, grade, grade_title, grade_explanation, roast_bullets, scores, languages, 
        radar_roast, segment_roast, comparison_roast
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (username) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        repos_count = EXCLUDED.repos_count,
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        joined_year = EXCLUDED.joined_year,
        grade = EXCLUDED.grade,
        grade_title = EXCLUDED.grade_title,
        grade_explanation = EXCLUDED.grade_explanation,
        roast_bullets = EXCLUDED.roast_bullets,
        scores = EXCLUDED.scores,
        languages = EXCLUDED.languages,
        radar_roast = EXCLUDED.radar_roast,
        segment_roast = EXCLUDED.segment_roast,
        comparison_roast = EXCLUDED.comparison_roast,
        created_at = CURRENT_TIMESTAMP;
    `;

    const values = [
      cleanUsername,
      profile.name,
      profile.avatarUrl,
      profile.bio,
      profile.reposCount,
      profile.followersCount,
      profile.followingCount,
      profile.joinedYear,
      profile.grade,
      profile.gradeTitle,
      profile.gradeExplanation,
      profile.roastBullets,
      JSON.stringify(profile.scores),
      JSON.stringify(profile.languages),
      profile.radarRoast,
      profile.segmentRoast,
      profile.comparisonRoast,
    ];

    await pool.query(query, values);
    console.log(`📁 Saved and upserted user roast into Postgres: ${cleanUsername}`);
  } catch (error: any) {
    console.error(`❌ PostgreSQL INSERT/UPSERT failed for user ${profile.username}:`, error.message);
  }
}

// Retrieve dynamic list of roasted users for Leaderboard
export async function getLeaderboardFromDB(): Promise<any[]> {
  try {
    const pool = await getPgPool();
    if (!pool || !isPgHealthy) return [];

    const result = await pool.query(`
      SELECT username, name, avatar_url, grade, scores 
      FROM roasted_users 
      LIMIT 100
    `);
    
    return result.rows
      .map((row) => {
        const scores = typeof row.scores === "string" ? JSON.parse(row.scores) : (row.scores || {});
        const avg = (
          (scores.codeQuality || 0) + 
          (scores.consistency || 0) + 
          (scores.documentation || 0) + 
          (scores.originality || 0) + 
          (scores.impact || 0)
        ) / 5;

        return {
          username: row.username,
          name: row.name,
          avatarUrl: row.avatar_url,
          grade: row.grade,
          avgScore: avg,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .map(({ avgScore, ...item }) => item);
  } catch (error: any) {
    console.error("❌ PostgreSQL Leaderboard Query failed:", error.message);
  }
  return [];
}
