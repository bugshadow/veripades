const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

router.post('/register', async (req, res, next) => {
    try {
        const user = await authService.register(req.body || {});
        res.status(201).json({ user });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const result = await authService.login(req.body || {});
        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
