const jwtUtils = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acces refuse. Token manquant.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwtUtils.verifyAuthToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token invalide ou expire.' });
    }
};

module.exports = authMiddleware;
