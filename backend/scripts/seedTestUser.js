require('dotenv').config();

const userRepository = require('../src/repositories/userRepository');
const authService = require('../src/services/authService');
const pool = require('../src/db/pool');

const TEST_USER = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'test@dgssi.ma',
    password: 'TestPOC2026!'
};

async function main() {
    const passwordHash = await authService.hashPassword(TEST_USER.password);
    const user = await userRepository.upsertTestUser({
        id: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash
    });

    console.log(JSON.stringify({ id: user.id, email: user.email }, null, 2));
}

main()
    .catch((error) => {
        console.error('[seedTestUser]', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
