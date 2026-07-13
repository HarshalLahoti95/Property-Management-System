const { UserRole } = require('@prisma/client');
console.log("UserRole.TENANT =", UserRole.TENANT);
console.log("Is 'TENANT' === UserRole.TENANT?", 'TENANT' === UserRole.TENANT);
