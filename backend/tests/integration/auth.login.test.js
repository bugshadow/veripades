require('../setup/jest.setup');
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');
const authService = require('../../src/services/authService');
const jwtUtils = require('../../src/utils/jwt');
const {
    primaryUser,
    spacedPasswordUser,
    nonexistentEmail,
    sqlInjectionEmail,
    uniqueEmail
} = require('../fixtures/users.fixture');

async function insertUser({ email, password }) {
    const normalizedEmail = authService.normalizeEmail(email);
    const passwordHash = await authService.hashPassword(password);
    const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email;',
        [normalizedEmail, passwordHash]
    );
    return result.rows[0];
}

describe('POST /api/auth/login', () => {
    it('connecte un utilisateur avec le bon email et le bon mot de passe', async () => {
        const user = await insertUser(primaryUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send(primaryUser);

        const decoded = jwtUtils.verifyAuthToken(response.body.token);

        expect(response.status).toBe(200);
        expect(decoded.id).toBe(user.id);
    });

    it('rejette un mauvais mot de passe avec le message generique', async () => {
        await insertUser(primaryUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: primaryUser.email, password: 'WrongPOC2026!' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: authService.INVALID_CREDENTIALS_MESSAGE });
    });

    it('renvoie exactement la meme erreur pour email inexistant et mauvais mot de passe', async () => {
        await insertUser(primaryUser);

        const wrongPasswordResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: primaryUser.email, password: 'WrongPOC2026!' });
        const unknownEmailResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: nonexistentEmail, password: primaryUser.password });

        expect({ status: unknownEmailResponse.status, body: unknownEmailResponse.body }).toEqual({
            status: wrongPasswordResponse.status,
            body: wrongPasswordResponse.body
        });
    });

    it('connecte un email avec une casse differente', async () => {
        await insertUser(primaryUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'TEST@DGSSI.MA', password: primaryUser.password });

        expect(response.status).toBe(200);
    });

    it('respecte les espaces en debut et fin de mot de passe', async () => {
        await insertUser(spacedPasswordUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send(spacedPasswordUser);

        expect(response.status).toBe(200);
    });

    it('ne trim pas le mot de passe avant comparaison', async () => {
        await insertUser(spacedPasswordUser);

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: spacedPasswordUser.email, password: spacedPasswordUser.password.trim() });

        expect(response.status).toBe(401);
    });

    it('rejette un email inexistant avec une tentative SQL injection basique', async () => {
        await insertUser({ email: uniqueEmail('injection'), password: primaryUser.password });

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: sqlInjectionEmail, password: primaryUser.password });

        expect(response.status).toBe(401);
    });

    it('rejette un mot de passe vide avec un code 400', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: primaryUser.email, password: '' });

        expect(response.status).toBe(400);
    });

    it('rejette un champ mot de passe manquant avec un code 400', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: primaryUser.email });

        expect(response.status).toBe(400);
    });
});

