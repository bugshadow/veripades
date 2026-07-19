const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

const DEFAULT_TEST_DATABASE_URL = 'postgres://postgres:motdepassefort@localhost:5433/poc_signature_test';
const STORAGE_DIR = path.resolve(__dirname, '..', 'tmp', 'storage');
let prepared = false;

function isRunningInsideDocker() {
    return fs.existsSync('/.dockerenv');
}

function deriveTestDatabaseUrl(databaseUrl) {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '');
    const testDatabaseName = databaseName.toLowerCase().includes('test')
        ? databaseName
        : `${databaseName}_test`;

    parsed.pathname = `/${testDatabaseName}`;

    if (parsed.hostname === 'db' && !isRunningInsideDocker()) {
        parsed.hostname = '127.0.0.1';
        parsed.port = '5433';
    }

    return parsed.toString();
}

function getTestDatabaseUrl() {
    const databaseUrl = process.env.TEST_DATABASE_URL
        || (process.env.DATABASE_URL ? deriveTestDatabaseUrl(process.env.DATABASE_URL) : DEFAULT_TEST_DATABASE_URL);

    assertSafeTestDatabaseUrl(databaseUrl);
    return databaseUrl;
}

function assertSafeTestDatabaseUrl(databaseUrl) {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '');

    if (!databaseName || !databaseName.toLowerCase().includes('test')) {
        throw new Error(`Refus d'utiliser une base non-test pour Jest: ${databaseName || '(vide)'}`);
    }
}

function adminDatabaseUrl(databaseUrl) {
    const parsed = new URL(databaseUrl);
    parsed.pathname = '/postgres';
    return parsed.toString();
}

function quoteIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
}

async function createDatabaseIfMissing(databaseUrl) {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '');
    const client = new Client({ connectionString: adminDatabaseUrl(databaseUrl) });

    await client.connect();
    try {
        const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1;', [databaseName]);
        if (exists.rowCount === 0) {
            await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)};`);
        }
    } finally {
        await client.end();
    }
}

async function ensureSchema(databaseUrl) {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                email varchar(255) NOT NULL UNIQUE,
                password_hash varchar(255) NOT NULL,
                created_at timestamp NOT NULL DEFAULT current_timestamp
            );

            CREATE TABLE IF NOT EXISTS certificates (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                serial_number varchar(255) NOT NULL UNIQUE,
                public_key text NOT NULL,
                valid_from timestamp NOT NULL,
                valid_to timestamp NOT NULL,
                is_revoked boolean NOT NULL DEFAULT false,
                created_at timestamp NOT NULL DEFAULT current_timestamp
            );

            CREATE TABLE IF NOT EXISTS documents (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                original_name varchar(255) NOT NULL,
                file_path varchar(500) NOT NULL,
                mime_type varchar(255) NOT NULL,
                size integer NOT NULL,
                signed_file_path varchar(500),
                before_hash varchar(64),
                after_hash varchar(64),
                status varchar(50) NOT NULL DEFAULT 'PENDING',
                created_at timestamp NOT NULL DEFAULT current_timestamp,
                updated_at timestamp NOT NULL DEFAULT current_timestamp
            );

            CREATE TABLE IF NOT EXISTS signatures (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
                certificate_id uuid NOT NULL REFERENCES certificates(id) ON DELETE RESTRICT,
                hash_before varchar(255) NOT NULL,
                hash_after varchar(255) NOT NULL,
                created_at timestamp NOT NULL DEFAULT current_timestamp
            );

            CREATE TABLE IF NOT EXISTS timestamps (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                signature_id uuid NOT NULL REFERENCES signatures(id) ON DELETE RESTRICT,
                serial_number varchar(255) NOT NULL UNIQUE,
                generated_at timestamp NOT NULL
            );
        `);
    } finally {
        await client.end();
    }
}

function configureTestEnvironment() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-not-for-production';
    process.env.DATABASE_URL = getTestDatabaseUrl();
    process.env.PDF_STORAGE_DIR = process.env.TEST_PDF_STORAGE_DIR || STORAGE_DIR;

    if (isRunningInsideDocker()) {
        process.env.CRYPTO_SERVICE_URL = process.env.CRYPTO_SERVICE_URL || 'http://crypto:8000';
        process.env.PDF_STORAGE_DIR = process.env.TEST_PDF_STORAGE_DIR || '/app/storage';
    } else {
        process.env.CRYPTO_SERVICE_URL = 'http://localhost:8000';
    }
}

function assertStoragePathIsSafe() {
    const resolved = path.resolve(process.env.PDF_STORAGE_DIR || STORAGE_DIR);
    const allowedRoot = path.resolve(__dirname, '..', 'tmp');

    const isInsideTestTmp = resolved.startsWith(allowedRoot);
    const isDockerSharedStorage = isRunningInsideDocker() && resolved === path.resolve('/app/storage');

    if (!isInsideTestTmp && !isDockerSharedStorage) {
        throw new Error(`Refus de nettoyer un dossier hors tests/tmp: ${resolved}`);
    }
}

function resetStorageDir() {
    assertStoragePathIsSafe();
    const dir = process.env.PDF_STORAGE_DIR || STORAGE_DIR;

    if (isRunningInsideDocker() && dir === '/app/storage') {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    } else {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function prepareTestDatabase() {
    configureTestEnvironment();
    if (prepared) return;

    await createDatabaseIfMissing(process.env.DATABASE_URL);
    await ensureSchema(process.env.DATABASE_URL);
    resetStorageDir();
    prepared = true;
}

async function resetTestDatabase() {
    const pool = require('../../src/db/pool');
    await pool.query('TRUNCATE TABLE timestamps, signatures, documents, certificates, users RESTART IDENTITY CASCADE;');
    resetStorageDir();
}

async function closeTestDatabase() {
    const pool = require('../../src/db/pool');
    await pool.end();
    prepared = false;
}

module.exports = {
    DEFAULT_TEST_DATABASE_URL,
    STORAGE_DIR,
    assertSafeTestDatabaseUrl,
    deriveTestDatabaseUrl,
    configureTestEnvironment,
    prepareTestDatabase,
    resetTestDatabase,
    closeTestDatabase
};



