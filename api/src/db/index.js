import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Render requires SSL
});

export const db = {
  /**
   * Find users by filter (e.g. missing stripe_customer_id).
   * Example: await db.find({ stripe_customer_id: null });
   */
  async find(filter) {
    const keys = Object.keys(filter);
    const conditions = keys.map((k, i) =>
      filter[k] === null ? `${k} IS NULL` : `${k} = $${i + 1}`
    );
    const values = keys.filter(k => filter[k] !== null).map(k => filter[k]);

    const sql = `SELECT * FROM users ${
      conditions.length ? "WHERE " + conditions.join(" AND ") : ""
    }`;
    const { rows } = await pool.query(sql, values);
    return rows;
  },

  /**
   * Find a user by ID.
   */
  async findById(id) {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0];
  },

  /**
   * Create a new user.
   */
  async create({ email, name, password }) {
    const { rows } = await pool.query(
      "INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING *",
      [email, name, password]
    );
    return rows[0];
  },

  /**
   * Update a user by ID with given fields.
   */
  async update(id, fields) {
    const keys = Object.keys(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map(k => fields[k]);

    const { rows } = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return rows[0];
  },
};