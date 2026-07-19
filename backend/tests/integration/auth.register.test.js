require('../setup/jest.setup');
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');
const authService = require('../../src/services/authService');
const { uniqueEmail, weakPassword } = require('../fixtures/users.fixture');

const validPassword = 'RegisterPOC2026!';

describe('POST /api/auth/register', () => {
    it('inscrit un utilisateur valide sans renvoyer le mot de passe', async () => {
        const email = uniqueEmail('register');

        const response = await request(app)
            .post('/api/auth/register')
            .send({ email, password: validPassword });

        expect(response.status).toBe(201);
        expect(JSON.stringify(response.body)).not.toContain(validPassword);
    });

    it('stocke un hash bcrypt et jamais le mot de passe en clair', async () => {
        const email = uniqueEmail('hash');

        await request(app)
            .post('/api/auth/register')
            .send({ email, password: validPassword });

        const stored = await pool.query('SELECT password_hash FROM users WHERE email = $1;', [email]);

        expect(stored.rows[0].password_hash).toMatch(/^\$2[aby]\$12\$/);
        expect(stored.rows[0].password_hash).not.toBe(validPassword);
    });

    it('rejette un email deja pris avec un code 409 et un message generique', async () => {
        const email = uniqueEmail('duplicate');

        await request(app)
            .post('/api/auth/register')
            .send({ email, password: validPassword });

        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: email.toUpperCase(), password: validPassword });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: authService.DUPLICATE_ACCOUNT_MESSAGE });
    });

    it('rejette un mot de passe de moins de 8 caracteres avec un code 400', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: uniqueEmail('weak'), password: weakPassword });

        expect(response.status).toBe(400);
    });

    it('rejette un email invalide avec un code 400', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: 'not-an-email', password: validPassword });

        expect(response.status).toBe(400);
    });

    it('rejette les champs manquants avec un code 400', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: uniqueEmail('missing') });

        expect(response.status).toBe(400);
    });
});

