require('../setup/jest.setup');
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');
const authService = require('../../src/services/authService');
const jwtUtils = require('../../src/utils/jwt');
const { uniqueEmail } = require('../fixtures/users.fixture');

const SIGNER_ID = 'integration-test-signer';

async function registerAndGetToken(email) {
    const passwordHash = await authService.hashPassword('SignTestPOC2026!');
    const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email;',
        [email, passwordHash]
    );
    const user = result.rows[0];
    return { user, token: jwtUtils.signAuthToken(user) };
}

function validPdfBuffer() {
    const objects = [];
    const offsets = [];
    let content = '%PDF-1.4\n';

    offsets.push(content.length);
    content += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

    offsets.push(content.length);
    content += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

    offsets.push(content.length);
    content += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n';

    const xrefOffset = content.length;
    content += 'xref\n';
    content += '0 4\n';
    content += '0000000000 65535 f \n';
    for (const offset of offsets) {
        content += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    content += 'trailer\n';
    content += '<< /Size 4 /Root 1 0 R >>\n';
    content += 'startxref\n';
    content += `${xrefOffset}\n`;
    content += '%%EOF\n';

    return Buffer.from(content, 'latin1');
}

describe('Flux complet upload -> sign -> verify', () => {
    it('upload un PDF et cree un document en base', async () => {
        const { token } = await registerAndGetToken(uniqueEmail('upload'));
        const pdf = validPdfBuffer();

        const response = await request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pdf, { filename: 'test-sign.pdf', contentType: 'application/pdf' });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.status).toBe('PENDING');
        expect(response.body.beforeHash).toBeDefined();
    });

    it('signe un document via le microservice cryptographique reel', async () => {
        const { token } = await registerAndGetToken(uniqueEmail('sign'));
        const pdf = validPdfBuffer();

        const uploadRes = await request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pdf, { filename: 'test-sign-real.pdf', contentType: 'application/pdf' });

        const docId = uploadRes.body.id;

        const signRes = await request(app)
            .post(`/api/documents/${docId}/sign`)
            .set('Authorization', `Bearer ${token}`)
            .send({ signerId: SIGNER_ID });

        expect(signRes.status).toBe(200);
        expect(signRes.body.message).toBe('Document signe avec succes');
        expect(signRes.body.details.signed_pdf_path).toBeDefined();
        expect(signRes.body.details.before_sha256).toBeDefined();
        expect(signRes.body.details.after_sha256).toBeDefined();
        expect(signRes.body.details.before_sha256).not.toBe(signRes.body.details.after_sha256);
    });

    it('verifie lintegrite du document signe (intact)', async () => {
        const { token } = await registerAndGetToken(uniqueEmail('verify'));
        const pdf = validPdfBuffer();

        const uploadRes = await request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pdf, { filename: 'test-verify-intact.pdf', contentType: 'application/pdf' });

        const docId = uploadRes.body.id;

        await request(app)
            .post(`/api/documents/${docId}/sign`)
            .set('Authorization', `Bearer ${token}`)
            .send({ signerId: SIGNER_ID });

        const verifyRes = await request(app)
            .post(`/api/documents/${docId}/verify`);

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.integrity).toBe('intact');
        expect(verifyRes.body.is_integral).toBe(true);
        expect(verifyRes.body.signer).toBeDefined();
    });

    it('flux complet upload -> sign -> verify en sequence', async () => {
        const { token } = await registerAndGetToken(uniqueEmail('fullflow'));
        const pdf = validPdfBuffer();

        const uploadRes = await request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pdf, { filename: 'full-flow.pdf', contentType: 'application/pdf' });

        expect(uploadRes.status).toBe(201);
        const docId = uploadRes.body.id;
        expect(uploadRes.body.status).toBe('PENDING');

        const signRes = await request(app)
            .post(`/api/documents/${docId}/sign`)
            .set('Authorization', `Bearer ${token}`)
            .send({ signerId: SIGNER_ID });

        expect(signRes.status).toBe(200);
        expect(signRes.body.details.before_sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(signRes.body.details.after_sha256).toMatch(/^[a-f0-9]{64}$/);

        const verifyRes = await request(app)
            .post(`/api/documents/${docId}/verify`);

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.integrity).toBe('intact');
        expect(verifyRes.body.is_integral).toBe(true);
        expect(verifyRes.body.signer.common_name).toBeDefined();
        expect(verifyRes.body.certificate_chain.length).toBeGreaterThan(0);
    });

    it('rejette la signature dun document deja signe', async () => {
        const { token } = await registerAndGetToken(uniqueEmail('already'));
        const pdf = validPdfBuffer();

        const uploadRes = await request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pdf, { filename: 'already-signed.pdf', contentType: 'application/pdf' });

        const docId = uploadRes.body.id;

        await request(app)
            .post(`/api/documents/${docId}/sign`)
            .set('Authorization', `Bearer ${token}`)
            .send({ signerId: SIGNER_ID });

        const secondSignRes = await request(app)
            .post(`/api/documents/${docId}/sign`)
            .set('Authorization', `Bearer ${token}`)
            .send({ signerId: SIGNER_ID });

        expect(secondSignRes.status).toBe(500);
    });

    it('rejette la signature sans signerId', async () => {
        const { token } = await registerAndGetToken(uniqueEmail('nosigner'));
        const pdf = validPdfBuffer();

        const uploadRes = await request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', pdf, { filename: 'no-signer.pdf', contentType: 'application/pdf' });

        const docId = uploadRes.body.id;

        const signRes = await request(app)
            .post(`/api/documents/${docId}/sign`)
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(signRes.status).toBe(400);
    });
});
