const cryptoService = require('./cryptoService');
const documentRepository = require('../repositories/documentRepository');
const fs = require('fs');
const nodeCrypto = require('crypto');

const PUBLIC_NOT_VERIFIABLE_MESSAGE = 'Document introuvable ou non verifiable.';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicNotVerifiableError() {
    const error = new Error(PUBLIC_NOT_VERIFIABLE_MESSAGE);
    error.status = 404;
    return error;
}

class DocumentService {
    calculateSha256(filePath) {
        return nodeCrypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    }

    async createDocument(userId, file) {
        // Enregistre les metadonnees en base
        const document = await documentRepository.create({
            userId,
            originalName: file.originalname,
            filePath: file.path,
            mimeType: file.mimetype,
            size: file.size,
            status: 'PENDING',
            beforeHash: this.calculateSha256(file.path)
        });
        return document;
    }

    async getDocumentsByUser(userId) {
        return await documentRepository.findByUserId(userId);
    }

    async getDocumentById(docId, userId) {
        const document = await documentRepository.findByIdAndUserId(docId, userId);
        return document;
    }

    async signDocument(docId, userId, signerId) {
        const document = await this.getDocumentById(docId, userId);
        if (!document) throw new Error('Document introuvable.');
        if (document.status === 'SIGNED') throw new Error('Document deja signe.');

        try {
            // Appel au microservice Python
            const cryptoResponse = await cryptoService.signDocument(document.filePath, signerId);
            
            // cryptoResponse devrait contenir le chemin du PDF signe ou son contenu
            // Pour le POC on suppose que le service Python renvoie les metadonnees et un buffer ou un chemin
            // Mettons a jour le statut
            await documentRepository.updateStatus(docId, 'SIGNED', {
                signedFilePath: cryptoResponse.signed_pdf_path || `${document.filePath}-signed.pdf`,
                beforeHash: cryptoResponse.before_sha256,
                afterHash: cryptoResponse.after_sha256
            });

            return {
                message: 'Document signe avec succes',
                details: cryptoResponse
            };
        } catch (error) {
            await documentRepository.updateStatus(docId, 'ERROR');
            throw error;
        }
    }

    async verifyPublicDocumentById(docId) {
        if (!UUID_PATTERN.test(docId)) throw publicNotVerifiableError();

        const document = await documentRepository.findById(docId);
        if (!document || document.status !== 'SIGNED' || !document.signedFilePath || !fs.existsSync(document.signedFilePath)) {
            throw publicNotVerifiableError();
        }

        const verificationReport = await cryptoService.verifyDocument(document.signedFilePath);
        return this.toPublicVerificationReport(verificationReport);
    }

    async verifyUploadedDocument(filePath) {
        const verificationReport = await cryptoService.verifyDocument(filePath);
        return this.toPublicVerificationReport(verificationReport);
    }

    toPublicVerificationReport(report) {
        return {
            integrity: report.integrity,
            is_integral: Boolean(report.is_integral),
            message: report.message,
            signer: report.signer ? {
                common_name: report.signer.common_name,
                organization: report.signer.organization,
                serial_number: report.signer.serial_number,
                issuer: report.signer.issuer
            } : null,
            signature_date: report.signature_date,
            certificate_chain: Array.isArray(report.certificate_chain)
                ? report.certificate_chain.map((certificate) => ({
                    role: certificate.role,
                    common_name: certificate.common_name,
                    issuer: certificate.issuer,
                    serial_number: certificate.serial_number,
                    key: certificate.key,
                    valid: certificate.valid,
                    valid_at: certificate.valid_at,
                    not_before: certificate.not_before,
                    not_after: certificate.not_after,
                    revoked: certificate.revoked,
                    days_remaining: certificate.days_remaining
                }))
                : []
        };
    }
}

module.exports = new DocumentService();
module.exports.PUBLIC_NOT_VERIFIABLE_MESSAGE = PUBLIC_NOT_VERIFIABLE_MESSAGE;
