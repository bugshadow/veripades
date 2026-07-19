const pool = require('../db/pool');

function mapRowToUser(row) {
    if (!row) return null;

    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: row.created_at
    };
}

class UserRepository {
    async create({ email, passwordHash }) {
        const query = `
            INSERT INTO users (email, password_hash)
            VALUES ($1, $2)
            RETURNING id, email, password_hash, created_at;
        `;
        const result = await pool.query(query, [email, passwordHash]);
        return mapRowToUser(result.rows[0]);
    }

    async findByEmail(email) {
        const query = 'SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1;';
        const result = await pool.query(query, [email]);
        return mapRowToUser(result.rows[0]);
    }

    async upsertTestUser({ id, email, passwordHash }) {
        const query = `
            INSERT INTO users (id, email, password_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (id)
            DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash
            RETURNING id, email, password_hash, created_at;
        `;
        const result = await pool.query(query, [id, email, passwordHash]);
        return mapRowToUser(result.rows[0]);
    }
}

module.exports = new UserRepository();
module.exports.mapRowToUser = mapRowToUser;
