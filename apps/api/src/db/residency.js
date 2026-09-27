import pkg from "pg";
const { Pool } = pkg;

const dbPools = {
    us: new Pool({ connectionString: process.env.DATABASE_URL_US }),
    eu: new Pool({ connectionString: process.env.DATABASE_URL_EU }),
    default: new Pool({ connectionString: process.env.DATABASE_URL }),
};

export function getRegionalDbPool(region) {
    const targetRegion = (region || "").toLowerCase();
    return dbPools[targetRegion] || dbPools.default;
}

export async function queryRegional(region, text, params) {
    const pool = getRegionalDbPool(region);
    return await pool.query(text, params);
}