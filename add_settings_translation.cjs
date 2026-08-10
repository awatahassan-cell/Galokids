const fs = require('fs');

let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

const enInsert = `
    settings: 'Settings',
`;

const kuInsert = `
    settings: 'ڕێکخستنەکان',
`;

const arInsert = `
    settings: 'الإعدادات',
`;

// Insert into EN
content = content.replace(/(en: {[\s\S]*?)(termsOfService:.*?\n)/, `$1$2${enInsert}`);
// Insert into KU
content = content.replace(/(ku: {[\s\S]*?)(termsOfService:.*?\n)/, `$1$2${kuInsert}`);
// Insert into AR
content = content.replace(/(ar: {[\s\S]*?)(termsOfService:.*?\n)/, `$1$2${arInsert}`);

fs.writeFileSync('src/i18n/translations.ts', content);
