const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// 1. Restore LedgerBalanceHistory
const ledgerBalanceHistoryModel = `
model LedgerBalanceHistory {
  id               String             @id @default(uuid())
  ledgerId         String
  oldBalance       Decimal            @db.Decimal(18, 2)
  newBalance       Decimal            @db.Decimal(18, 2)
  triggerEventType LedgerTriggerEvent
  triggerEventId   String
  changedAt        DateTime           @default(now())

  ledger FinancialLedger @relation(fields: [ledgerId], references: [id], onDelete: Restrict)

  @@index([ledgerId])
}
`;

// Insert it before LeaseSharePercentageHistory
content = content.replace(
  /model LeaseSharePercentageHistory {/,
  match => ledgerBalanceHistoryModel + '\n' + match
);

// 2. Add LedgerBalanceHistory back-relation to FinancialLedger
content = content.replace(
  /lease Lease @relation\(fields: \[leaseId\], references: \[id\], onDelete: Restrict\)/,
  match => match + "\n  rentCharges            RentCharge[]\n  payments               Payment[]\n  ledgerBalanceHistories LedgerBalanceHistory[]"
);

// 3. Add ledgerId to RentCharge
content = content.replace(
  /model RentCharge {\n  id           String       @id @default\(uuid\(\)\)\n  leaseId      String/,
  "model RentCharge {\n  id           String       @id @default(uuid())\n  ledgerId     String\n  leaseId      String"
);
content = content.replace(
  /lease              Lease               @relation\(fields: \[leaseId\], references: \[id\], onDelete: Restrict\)/,
  "ledger             FinancialLedger     @relation(fields: [ledgerId], references: [id], onDelete: Restrict)\n  lease              Lease               @relation(fields: [leaseId], references: [id], onDelete: Restrict)"
);
content = content.replace(
  /@@index\(\[leaseId, status\]\)/,
  "@@index([ledgerId])\n  @@index([leaseId, status])"
);

// 4. Add ledgerId to Payment
content = content.replace(
  /model Payment {\n  id                   String        @id @default\(uuid\(\)\)\n  leaseId              String/,
  "model Payment {\n  id                   String        @id @default(uuid())\n  ledgerId             String\n  leaseId              String"
);
content = content.replace(
  /lease              Lease               @relation\(fields: \[leaseId\], references: \[id\], onDelete: Restrict\)/,
  "ledger             FinancialLedger     @relation(fields: [ledgerId], references: [id], onDelete: Restrict)\n  lease              Lease               @relation(fields: [leaseId], references: [id], onDelete: Restrict)"
);
content = content.replace(
  /@@unique\(\[leaseId, billingMonth\]\)/,
  "@@index([ledgerId])\n  @@unique([leaseId, billingMonth])"
);

fs.writeFileSync(path, content);
