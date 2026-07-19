require('../setup/jest.setup');
const jwt = require('jsonwebtoken');
const jwtUtils = require('../../src/utils/jwt');

const user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'test@dgssi.ma',
    password: 'SecretPOC2026!',
    passwordHash: '$2b$12$neverExpose'
};

describe('jwt utils', () => {
    it('construit un payload sans mot de passe ni hash', () => {
        expect(jwtUtils.authPayload(user)).toEqual({
            id: user.id,
            email: user.email
        });
    });

    it('genere un token verifiable avec le secret JWT env', () => {
        const token = jwtUtils.signAuthToken(user);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        expect(decoded.email).toBe(user.email);
    });

    it('ne met jamais password ni passwordHash dans le token', () => {
        const token = jwtUtils.signAuthToken(user);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        expect(decoded).not.toHaveProperty('passwordHash');
        expect(decoded).not.toHaveProperty('password');
    });

    it('garde une expiration de deux heures pour le POC', () => {
        expect(jwtUtils.TOKEN_EXPIRES_IN).toBe('2h');
    });

    it('rejette un token invalide', () => {
        expect(() => jwtUtils.verifyAuthToken('token-invalide')).toThrow();
    });
});

