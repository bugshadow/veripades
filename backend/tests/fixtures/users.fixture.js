const path = require('path');

const primaryUser = {
    email: 'test@dgssi.ma',
    password: 'TestPOC2026!'
};

const secondaryUser = {
    email: 'second@dgssi.ma',
    password: 'SecondPOC2026!'
};

const spacedPasswordUser = {
    email: 'spaces@dgssi.ma',
    password: '  TestPOC2026!  '
};

function uniqueEmail(prefix = 'auth') {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}-${suffix}@dgssi.ma`;
}

const weakPassword = 'short';
const sqlInjectionEmail = "' OR '1'='1";
const nonexistentEmail = 'absent@dgssi.ma';
const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const pdfFile = {
    filename: 'fixture.pdf',
    contentType: 'application/pdf'
};

module.exports = {
    primaryUser,
    secondaryUser,
    spacedPasswordUser,
    weakPassword,
    sqlInjectionEmail,
    nonexistentEmail,
    pdfBuffer,
    pdfFile,
    uniqueEmail,
    fixturesRoot: path.join(__dirname)
};
