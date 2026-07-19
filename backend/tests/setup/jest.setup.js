const path = require('path');
const {
    configureTestEnvironment,
    prepareTestDatabase,
    resetTestDatabase,
    closeTestDatabase
} = require('./testDatabase');

configureTestEnvironment();

function isIntegrationTestFile() {
    const testPath = expect.getState().testPath || '';
    return testPath.includes(`${path.sep}integration${path.sep}`) || testPath.includes('/integration/');
}

if (isIntegrationTestFile()) {
    beforeAll(async () => {
        await prepareTestDatabase();
    });

    afterEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await closeTestDatabase();
    });
}
