module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'src/routes/authRoutes.js',
        'src/middlewares/authMiddleware.js',
        'src/services/authService.js',
        'src/utils/jwt.js'
    ],
    coveragePathIgnorePatterns: ['/node_modules/']
};
