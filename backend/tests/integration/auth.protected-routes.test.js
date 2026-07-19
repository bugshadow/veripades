require('../setup/jest.setup');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');
const authService = require('../../src/services/authService');
const jwtUtils = require('../../src/utils/jwt');
const {
    primaryUser,
    secondaryUser,
    pdfBuffer,
    pdfFile
} = require('../fixtures/users.fixture');

async function insertUserAndToken(userInput) {
    const passwordHash = await authService.hashPassword(userInput.password);
    const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email;',
        [authService.normalizeEmail(userInput.email), passwordHash]
    );
    const user = result.rows[0];
    return {
        user,
        token: jwtUtils.signAuthToken(user)
    };
}

async function uploadPdf(token, filename) {
    return request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', pdfBuffer, { ...pdfFile, filename });
}

describe('Routes protegees par JWT', () => {
    it('rejette GET /api/documents sans token avec un code 401', async () => {
        const response = await request(app).get('/api/documents');

        expect(response.status).toBe(401);
    });

    it('rejette un token expire avec un code 403', async () => {
        const expiredToken = jwt.sign(
            { id: '00000000-0000-4000-8000-000000000001', email: primaryUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '-1s' }
        );

        const response = await request(app)
            .get('/api/documents')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(403);
    });

    it('autorise GET /api/documents avec un token valide', async () => {
        const { token } = await insertUserAndToken(primaryUser);

        const response = await request(app)
            .get('/api/documents')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
    });

    it('autorise POST /api/documents avec un token valide', async () => {
        const { token } = await insertUserAndToken(primaryUser);

        const response = await uploadPdf(token, 'primary.pdf');

        expect(response.status).toBe(201);
    });

    it('liste uniquement les documents du proprietaire du token', async () => {
        const primary = await insertUserAndToken(primaryUser);
        const secondary = await insertUserAndToken(secondaryUser);

        const primaryUpload = await uploadPdf(primary.token, 'primary.pdf');
        await uploadPdf(secondary.token, 'secondary.pdf');

        const response = await request(app)
            .get('/api/documents')
            .set('Authorization', `Bearer ${primary.token}`);

        expect(response.body.map((document) => document.id)).toEqual([primaryUpload.body.id]);
    });
});

