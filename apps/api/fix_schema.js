const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/paymentDocuments\s+PaymentDocument\[\]\n?/g, '');

fs.writeFileSync(path, content);
