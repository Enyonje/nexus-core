import pg from "pg";

const { Pool } = pg;
const dbPools = {};

export function getRegionalDbPool(region) {
    const targetRegion = (region || "").toLowerCase();
    const key = ["us", "eu"].includes(targetRegion) ? targetRegion : "default";

    if (dbPools[key]) return dbPools[key];

    const connectionString = key === "us"
        ? process.env.DATABASE_URL_US
        : key === "eu"
            ? process.env.DATABASE_URL_EU
            : process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error(`Database URL is not configured for region: ${key}`);
    }

    dbPools[key] = new Pool({
        connectionString,
        max: 1,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        ssl: { rejectUnauthorized: false },
    });

    dbPools[key].on("error", err => {
        console.error(`Regional PostgreSQL pool error (${key}):`, err.message);
    });

    return dbPools[key];
}

export async function queryRegional(region, text, params) {
    return getRegionalDbPool(region).query(text, params);
}
