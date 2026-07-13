import sys
mig_file = sys.argv[1] + '/migration.sql'
with open(mig_file, 'r') as f:
    content = f.read()

truncate_stmt = """-- Explicitly truncate legacy accounting data before schema modification 
-- since these modules are being rebuilt from scratch.
TRUNCATE TABLE "PaymentAllocation", "Payment", "RentCharge", "LedgerBalanceHistory", "FinancialLedger" CASCADE;

"""
with open(mig_file, 'w') as f:
    f.write(truncate_stmt + content)
