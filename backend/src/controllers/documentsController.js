const documentService = require('../services/documentService');
const fs = require('fs');

class DocumentsController {
    async uploadDocument(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Aucun fichier PDF fourni.' });
            }
            if (req.file.mimetype !== 'application/pdf') {
                // Nettoyage
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Seuls les fichiers PDF sont acceptes.' });
            }

            const document = await documentService.createDocument(req.user.id, req.file);
            res.status(201).json(document);
        } catch (error) {
            next(error);
        }
    }

    async listDocuments(req, res, next) {
        try {
            const documents = await documentService.getDocumentsByUser(req.user.id);
            res.json(documents);
        } catch (error) {
            next(error);
        }
    }

    async getDocument(req, res, next) {
        try {
            const document = await documentService.getDocumentById(req.params.id, req.user.id);
            if (!document) {
                return res.status(404).json({ error: 'Document non trouve.' });
            }
            res.json(document);
        } catch (error) {
            next(error);
        }
    }

    async signDocument(req, res, next) {
        try {
            const { signerId } = req.body;
            if (!signerId) {
                return res.status(400).json({ error: 'L\'ID du signataire est requis.' });
            }

            const result = await documentService.signDocument(req.params.id, req.user.id, signerId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async downloadDocument(req, res, next) {
        try {
            const document = await documentService.getDocumentById(req.params.id, req.user.id);
            if (!document) {
                return res.status(404).json({ error: 'Document non trouve.' });
            }
            if (document.status !== 'SIGNED' || !document.signedFilePath) {
                return res.status(404).json({ error: 'Le document signe n\'est pas disponible au telechargement.' });
            }
            if (!fs.existsSync(document.signedFilePath)) {
                return res.status(404).json({ error: 'Fichier signe introuvable sur le serveur.' });
            }
            const downloadName = document.originalName.replace(/\.pdf$/i, '') + '-signe.pdf';
            res.download(document.signedFilePath, downloadName);
        } catch (error) {
            next(error);
        }
    }

    async verifyDocument(req, res, next) {
        let uploadedPath = null;

        try {
            if (req.file) {
                uploadedPath = req.file.path;
                if (req.file.mimetype !== 'application/pdf') {
                    return res.status(400).json({ error: 'Seuls les fichiers PDF sont acceptes.' });
                }

                const result = await documentService.verifyUploadedDocument(uploadedPath);
                return res.json(result);
            }

            if (!req.params.id) {
                return res.status(400).json({ error: documentService.PUBLIC_NOT_VERIFIABLE_MESSAGE });
            }

            const result = await documentService.verifyPublicDocumentById(req.params.id);
            return res.json(result);
        } catch (error) {
            next(error);
        } finally {
            if (uploadedPath && fs.existsSync(uploadedPath)) {
                fs.unlink(uploadedPath, () => {});
            }
        }
    }
}

module.exports = new DocumentsController();
