import { Injectable } from '@nestjs/common';

/**
 * Map of supported lease-document placeholders to extractor functions.
 *
 * Each extractor receives the rich lease object (with relations) and returns
 * the replacement string.  If a value is unavailable, the placeholder is left
 * as-is so downstream consumers can detect missing data.
 */
type PlaceholderExtractor = (lease: LeaseWithRelations) => string;

/**
 * Minimal type describing a Lease joined with its relations.
 * Kept intentionally loose (`any`-friendly) so the service
 * works regardless of how Prisma includes are configured.
 */
interface LeaseWithRelations {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  monthlyRent: number | { toString(): string };
  securityDeposit: number | { toString(): string };
  rentDueDay: number;
  gracePeriodDays: number;
  status: string;
  unit?: {
    unitNumber?: string;
    property?: {
      name?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    landlord?: {
      fullName?: string;
      email?: string;
      phone?: string;
    };
  };
  leaseTenants?: Array<{
    tenant?: {
      fullName?: string;
      email?: string;
      phone?: string;
    };
  }>;
}

// ─── Placeholder Registry ─────────────────────────────────────────────────────

const PLACEHOLDER_MAP: Record<string, PlaceholderExtractor> = {
  '[LANDLORD FULL NAME]': (l) => l.unit?.landlord?.fullName ?? '[LANDLORD FULL NAME]',
  '[LANDLORD EMAIL]': (l) => l.unit?.landlord?.email ?? '[LANDLORD EMAIL]',
  '[LANDLORD PHONE]': (l) => l.unit?.landlord?.phone ?? '[LANDLORD PHONE]',

  '[TENANT FULL NAME]': (l) => l.leaseTenants?.[0]?.tenant?.fullName ?? '[TENANT FULL NAME]',
  '[TENANT EMAIL]': (l) => l.leaseTenants?.[0]?.tenant?.email ?? '[TENANT EMAIL]',
  '[TENANT PHONE]': (l) => l.leaseTenants?.[0]?.tenant?.phone ?? '[TENANT PHONE]',

  '[ALL TENANT NAMES]': (l) =>
    l.leaseTenants?.map((lt) => lt.tenant?.fullName).filter(Boolean).join(', ') || '[ALL TENANT NAMES]',

  '[FULL PROPERTY ADDRESS]': (l) => {
    const p = l.unit?.property;
    if (!p) return '[FULL PROPERTY ADDRESS]';
    return [p.streetAddress, p.city, p.state, p.zipCode].filter(Boolean).join(', ');
  },
  '[PROPERTY NAME]': (l) => l.unit?.property?.name ?? '[PROPERTY NAME]',
  '[UNIT NUMBER]': (l) => l.unit?.unitNumber ?? '[UNIT NUMBER]',

  '[START DATE]': (l) => formatDate(l.startDate),
  '[END DATE]': (l) => formatDate(l.endDate),
  '[AMOUNT]': (l) => formatCurrency(l.monthlyRent),
  '[MONTHLY RENT]': (l) => formatCurrency(l.monthlyRent),
  '[SECURITY DEPOSIT]': (l) => formatCurrency(l.securityDeposit),
  '[RENT DUE DAY]': (l) => String(l.rentDueDay),
  '[GRACE PERIOD DAYS]': (l) => String(l.gracePeriodDays),

  '[LEASE ID]': (l) => l.id,
  '[LEASE STATUS]': (l) => l.status,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value: number | { toString(): string }): string {
  const num = typeof value === 'number' ? value : parseFloat(value.toString());
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Default Template ─────────────────────────────────────────────────────────

const DEFAULT_LEASE_TEMPLATE = `
================================================================================
                          RESIDENTIAL LEASE AGREEMENT
================================================================================

Lease ID: [LEASE ID]
Date Generated: ${new Date().toLocaleDateString('en-US')}

--------------------------------------------------------------------------------
                              PARTIES TO THE LEASE
--------------------------------------------------------------------------------

LANDLORD:
  Name:   [LANDLORD FULL NAME]
  Email:  [LANDLORD EMAIL]
  Phone:  [LANDLORD PHONE]

TENANT(S):
  Name:   [ALL TENANT NAMES]
  Email:  [TENANT EMAIL]
  Phone:  [TENANT PHONE]

--------------------------------------------------------------------------------
                              PROPERTY INFORMATION
--------------------------------------------------------------------------------

  Property:   [PROPERTY NAME]
  Address:    [FULL PROPERTY ADDRESS]
  Unit:       [UNIT NUMBER]

--------------------------------------------------------------------------------
                                 LEASE TERMS
--------------------------------------------------------------------------------

  Lease Start Date:     [START DATE]
  Lease End Date:       [END DATE]
  Monthly Rent:         [AMOUNT]
  Security Deposit:     [SECURITY DEPOSIT]
  Rent Due Day:         [RENT DUE DAY] of each month
  Grace Period:         [GRACE PERIOD DAYS] days

--------------------------------------------------------------------------------
                            TERMS AND CONDITIONS
--------------------------------------------------------------------------------

1. RENT PAYMENT
   Tenant agrees to pay the monthly rent of [MONTHLY RENT] on or before
   the [RENT DUE DAY]th day of each calendar month. A grace period of
   [GRACE PERIOD DAYS] day(s) is provided before late fees apply.

2. SECURITY DEPOSIT
   Tenant has paid a security deposit of [SECURITY DEPOSIT]. This deposit
   will be held per applicable state and local laws and returned within the
   legally required timeframe after the lease ends, less any lawful
   deductions for damages beyond normal wear and tear.

3. LEASE DURATION
   This lease begins on [START DATE] and expires on [END DATE]. Unless
   renewed or extended in writing, the Tenant must vacate the premises on
   or before the expiration date.

4. MAINTENANCE AND REPAIRS
   The Landlord shall maintain the property in a habitable condition.
   The Tenant shall promptly report any needed repairs via the property
   management system's work order portal.

5. USE OF PREMISES
   The leased unit shall be used exclusively for residential purposes.
   No commercial activity is permitted without written consent from the
   Landlord.

6. GOVERNING LAW
   This agreement shall be governed by and construed in accordance with
   the laws of the state in which the property is located.

--------------------------------------------------------------------------------
                                SIGNATURES
--------------------------------------------------------------------------------

Landlord:  ________________________________     Date:  ____________
           [LANDLORD FULL NAME]

Tenant:    ________________________________     Date:  ____________
           [TENANT FULL NAME]

================================================================================
`.trim();

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class LeaseTemplateService {
  /**
   * Returns the default lease document template string.
   */
  getDefaultTemplate(): string {
    return DEFAULT_LEASE_TEMPLATE;
  }

  /**
   * Populates every known placeholder in the given template using data
   * from the supplied lease entity (with relations).
   *
   * Unknown placeholders are left untouched so callers can detect missing
   * bindings.
   *
   * @param lease  – Lease entity with unit, property, landlord and tenant relations included.
   * @param template – Optional custom template string.  Falls back to the default template.
   * @returns The fully populated document string.
   */
  populate(lease: LeaseWithRelations, template?: string): string {
    let document = template ?? this.getDefaultTemplate();

    for (const [placeholder, extractor] of Object.entries(PLACEHOLDER_MAP)) {
      // Use split+join instead of regex to avoid escaping bracket characters
      document = document.split(placeholder).join(extractor(lease));
    }

    return document;
  }

  /**
   * Returns the list of supported placeholder tokens.
   * Useful for validation or documentation purposes.
   */
  getSupportedPlaceholders(): string[] {
    return Object.keys(PLACEHOLDER_MAP);
  }
}
