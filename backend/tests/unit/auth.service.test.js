require('../setup/jest.setup');
const authService = require('../../src/services/authService');

const password = 'UnitPOC2026!';

describe('authService password hashing', () => {
    it('hashe un mot de passe avec un hash bcrypt sans conserver le clair', async () => {
        const hash = await authService.hashPassword(password);

        expect(hash).toMatch(/^\$2[aby]\$12\$/);
        expect(hash).not.toBe(password);
    });

    it('valide un mot de passe correct contre son hash', async () => {
        const hash = await authService.hashPassword(password);

        await expect(authService.comparePassword(password, hash)).resolves.toBe(true);
    });

    it('rejette un mauvais mot de passe contre le meme hash', async () => {
        const hash = await authService.hashPassword(password);

        await expect(authService.comparePassword('WrongPOC2026!', hash)).resolves.toBe(false);
    });

    it('normalise un email avec espaces et casse mixte', () => {
        expect(authService.normalizeEmail('  Test@DGSSI.MA  ')).toBe('test@dgssi.ma');
    });

    it('rejette un mot de passe de moins de 8 caracteres', () => {
        expect(authService.validatePassword('short')).toBe(false);
    });
});

