const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const jwtUtils = require('../utils/jwt');

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS_MESSAGE = 'Email ou mot de passe incorrect';
const DUPLICATE_ACCOUNT_MESSAGE = 'Inscription impossible avec ces informations.';

// Cost 12 remains fast enough for this POC while making offline hash cracking materially harder than cost 10.
const DUMMY_PASSWORD_HASH = '$2b$12$pk65aG0klAqD8UzYQTO.x.5AAeuWXAAt4fURm6n0feOJjaLGYn03y';

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validateEmail(email) {
    return EMAIL_PATTERN.test(email);
}

function validatePassword(password) {
    return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email
    };
}

class AuthService {
    async hashPassword(password) {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    async comparePassword(password, passwordHash) {
        return bcrypt.compare(password, passwordHash);
    }

    async register({ email, password }) {
        const normalizedEmail = normalizeEmail(email);

        if (!validateEmail(normalizedEmail)) {
            const error = new Error('Email invalide.');
            error.status = 400;
            throw error;
        }

        if (!validatePassword(password)) {
            const error = new Error('Mot de passe invalide.');
            error.status = 400;
            throw error;
        }

        const existingUser = await userRepository.findByEmail(normalizedEmail);
        if (existingUser) {
            const error = new Error(DUPLICATE_ACCOUNT_MESSAGE);
            error.status = 409;
            throw error;
        }

        try {
            const passwordHash = await this.hashPassword(password);
            const user = await userRepository.create({ email: normalizedEmail, passwordHash });
            return publicUser(user);
        } catch (error) {
            if (error.code === '23505') {
                const conflict = new Error(DUPLICATE_ACCOUNT_MESSAGE);
                conflict.status = 409;
                throw conflict;
            }
            throw error;
        }
    }

    async login({ email, password }) {
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
            const error = new Error('Email et mot de passe requis.');
            error.status = 400;
            throw error;
        }

        const user = await userRepository.findByEmail(normalizedEmail);
        const passwordHash = user ? user.passwordHash : DUMMY_PASSWORD_HASH;
        const passwordMatches = await this.comparePassword(password, passwordHash);

        if (!user || !passwordMatches) {
            const error = new Error(INVALID_CREDENTIALS_MESSAGE);
            error.status = 401;
            throw error;
        }

        const safeUser = publicUser(user);
        return {
            user: safeUser,
            token: jwtUtils.signAuthToken(safeUser)
        };
    }
}

module.exports = new AuthService();
module.exports.SALT_ROUNDS = SALT_ROUNDS;
module.exports.MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
module.exports.INVALID_CREDENTIALS_MESSAGE = INVALID_CREDENTIALS_MESSAGE;
module.exports.DUPLICATE_ACCOUNT_MESSAGE = DUPLICATE_ACCOUNT_MESSAGE;
module.exports.normalizeEmail = normalizeEmail;
module.exports.validateEmail = validateEmail;
module.exports.validatePassword = validatePassword;
module.exports.publicUser = publicUser;
