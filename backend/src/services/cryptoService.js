const axios = require('axios');
const FormData = require('form-data');

class CryptoService {
    constructor() {
        this.client = axios.create({
            baseURL: process.env.CRYPTO_SERVICE_URL || 'http://localhost:8000',
            timeout: 5000,
        });
    }

    async _requestWithRetry(config, retries = 1) {
        try {
            return await this.client(config);
        } catch (error) {
            if (retries > 0 && (!error.response || error.response.status >= 500 || error.code === 'ECONNREFUSED')) {
                console.warn(`[CryptoService] Echec de l'appel. Tentative restante: ${retries}. Erreur: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return this._requestWithRetry(config, retries - 1);
            }

            if (error.code === 'ECONNREFUSED') {
                throw new Error('Le microservice cryptographique est indisponible.');
            }
            if (error.response) {
                const message = error.response.data?.detail || error.response.data?.error || 'Erreur du service crypto.';
                throw new Error(`Erreur Crypto: ${message}`);
            }
            throw new Error(`Erreur reseau: ${error.message}`);
        }
    }

    async signDocument(pdfPath, signerId) {
        const formData = new FormData();
        formData.append('file_path', pdfPath);
        formData.append('signer_id', signerId);

        const response = await this._requestWithRetry({
            method: 'post',
            url: '/sign',
            data: formData,
            headers: formData.getHeaders()
        });

        return response.data;
    }

    async verifyDocument(pdfPath) {
        const formData = new FormData();
        formData.append('file_path', pdfPath);

        const response = await this._requestWithRetry({
            method: 'post',
            url: '/verify',
            data: formData,
            headers: formData.getHeaders()
        });

        return response.data;
    }
}

module.exports = new CryptoService();
