const jwt = require('jsonwebtoken');

const TOKEN_EXPIRES_IN = '2h';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET manquant en configuration.');
    return secret;
}

function authPayload(user) {
    return {
        id: user.id,
        email: user.email
    };
}

function signAuthToken(user) {
    // Two hours is acceptable for a local POC: short enough to test expiry, long enough for demos.
    return jwt.sign(authPayload(user), getJwtSecret(), { expiresIn: TOKEN_EXPIRES_IN });
}

function verifyAuthToken(token) {
    return jwt.verify(token, getJwtSecret());
}

module.exports = {
    TOKEN_EXPIRES_IN,
    authPayload,
    signAuthToken,
    verifyAuthToken
};
