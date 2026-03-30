const fs = require('fs');
let content = fs.readFileSync('src/utils/PrescriptionPdfTemplate.ts', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\${/g, '${');
fs.writeFileSync('src/utils/PrescriptionPdfTemplate.ts', content);
console.log('Fixed');
