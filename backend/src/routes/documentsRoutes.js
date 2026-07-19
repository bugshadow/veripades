const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const documentsController = require('../controllers/documentsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Configuration Multer pour stocker temporairement les PDF en memoire (ou sur disque)
const upload = multer({ 
    dest: process.env.PDF_STORAGE_DIR || '/app/storage',
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

const verifyRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de demandes de verification. Reessayez dans une minute.' }
});

// POST /api/documents - Upload d'un PDF
router.post('/', authMiddleware, upload.single('file'), documentsController.uploadDocument);

// GET /api/documents - Liste des documents de l'utilisateur
router.get('/', authMiddleware, documentsController.listDocuments);

// POST /api/documents/verify - Verification publique par upload direct d'un PDF signe.
// Limite a 20 requetes/minute/IP car cet endpoint est accessible sans compte.
router.post('/verify', verifyRateLimiter, upload.single('file'), documentsController.verifyDocument);

// GET /api/documents/:id - Details d'un document
router.get('/:id', authMiddleware, documentsController.getDocument);

// POST /api/documents/:id/sign - Declenche la signature
router.post('/:id/sign', authMiddleware, documentsController.signDocument);

// POST /api/documents/:id/verify - Verification publique par identifiant partage.
// La reponse est filtree cote service pour ne pas exposer les donnees du proprietaire.
router.post('/:id/verify', verifyRateLimiter, upload.single('file'), documentsController.verifyDocument);

module.exports = router;
