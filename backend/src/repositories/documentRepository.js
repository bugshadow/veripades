const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

function mapRowToDocument(row) {
    if (!row) return null;

    return {
        id: row.id,
        userId: row.user_id,
        originalName: row.original_name,
        filePath: row.file_path,
        mimeType: row.mime_type,
        size: row.size,
        signedFilePath: row.signed_file_path,
        beforeHash: row.before_hash,
        afterHash: row.after_hash,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapDocumentToRow(data) {
    return {
        user_id: data.userId,
        original_name: data.originalName,
        file_path: data.filePath,
        mime_type: data.mimeType,
        size: data.size,
        status: data.status,
        before_hash: data.beforeHash
    };
}

function mapStatusExtrasToRow(extraData = {}) {
    const row = {};

    if (extraData.signedFilePath !== undefined) row.signed_file_path = extraData.signedFilePath;
    if (extraData.beforeHash !== undefined) row.before_hash = extraData.beforeHash;
    if (extraData.afterHash !== undefined) row.after_hash = extraData.afterHash;

    return row;
}

class DocumentRepository {
    async create(data) {
        const id = uuidv4();
        const row = mapDocumentToRow(data);
        const query = `
            INSERT INTO documents (id, user_id, original_name, file_path, mime_type, size, status, before_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [
            id,
            row.user_id,
            row.original_name,
            row.file_path,
            row.mime_type,
            row.size,
            row.status,
            row.before_hash
        ];

        const res = await pool.query(query, values);
        return mapRowToDocument(res.rows[0]);
    }

    async findByUserId(userId) {
        const query = `SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC;`;
        const res = await pool.query(query, [userId]);
        return res.rows.map(mapRowToDocument);
    }

    async findById(docId) {
        const query = `SELECT * FROM documents WHERE id = $1;`;
        const res = await pool.query(query, [docId]);
        return mapRowToDocument(res.rows[0]);
    }

    async findByIdAndUserId(docId, userId) {
        const query = `SELECT * FROM documents WHERE id = $1 AND user_id = $2;`;
        const res = await pool.query(query, [docId, userId]);
        return mapRowToDocument(res.rows[0]);
    }

    async updateStatus(docId, status, extraData = {}) {
        const extraRow = mapStatusExtrasToRow(extraData);
        const assignments = ['status = $1', 'updated_at = current_timestamp'];
        const values = [status];
        let paramIndex = 2;

        for (const [column, value] of Object.entries(extraRow)) {
            assignments.push(`${column} = $${paramIndex++}`);
            values.push(value);
        }

        const query = `
            UPDATE documents
            SET ${assignments.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *;
        `;
        values.push(docId);

        const res = await pool.query(query, values);
        return mapRowToDocument(res.rows[0]);
    }
}

module.exports = new DocumentRepository();
module.exports.mapRowToDocument = mapRowToDocument;
module.exports.mapDocumentToRow = mapDocumentToRow;
module.exports.mapStatusExtrasToRow = mapStatusExtrasToRow;

