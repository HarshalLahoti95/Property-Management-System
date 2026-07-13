import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentService } from '../../document/document.service';
import { LeaseDocumentPurpose, DocumentCategory, LeaseStatus } from '@prisma/client';
import { AttachmentEntityType } from '../../document/dto/create-document-attachment.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { marked } from 'marked';
import * as puppeteer from 'puppeteer';

@Injectable()
export class LeaseDocumentGeneratorService {
  private readonly logger = new Logger(LeaseDocumentGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
  ) {
    Handlebars.registerHelper('eq', function (arg1, arg2, options) {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    });
  }

  async generateDocument(leaseId: string, purpose: LeaseDocumentPurpose, user: { id: string; role: string }): Promise<void> {
    this.logger.log(`Generating lease document for ${leaseId} with purpose ${purpose}`);

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: { include: { landlord: true, property: true } },
        leaseTenants: { include: { tenant: true } },
        leaseStatusHistories: { orderBy: { changedAt: 'desc' } },
        leaseDocuments: { 
          where: { purpose },
          include: { document: true },
          orderBy: { createdAt: 'desc' } 
        },
      },
    });

    if (!lease) throw new Error(`Lease ${leaseId} not found for document generation.`);

    // Resolve Landlord Signature/Date (The moment it hit PENDING_TENANT_SIGNATURE)
    const signatureHistoryRow = lease.leaseStatusHistories.find(
      (h) => h.newStatus === LeaseStatus.PENDING_TENANT_SIGNATURE
    );
    const landlord_signed_date = signatureHistoryRow ? signatureHistoryRow.changedAt.toISOString().split('T')[0] : '';
    const landlord_signature = signatureHistoryRow ? lease.unit.landlord.fullName : '';

    // Resolve Tenant Signatures
    const activeTenants = lease.leaseTenants.filter((lt) => lt.status !== 'REMOVED');
    const tenant_name = activeTenants.map((lt) => lt.tenant.fullName).join(', ');
    const tenant_contact = activeTenants.map((lt) => lt.tenant.email).join(', ');

    const tenant_signature = activeTenants
      .map((lt) => (lt.signedAt ? lt.tenant.fullName : '(Pending)'))
      .join(', ');
    const tenant_signed_date = activeTenants
      .map((lt) => (lt.signedAt ? lt.signedAt.toISOString().split('T')[0] : '(Pending)'))
      .join(', ');

    // Compose Property Address
    const p = lease.unit.property;
    const property_address = `${p.streetAddress}, ${p.city}, ${p.state} ${p.zipCode}, Unit ${lease.unit.unitNumber}`;

    const terms = (lease.leaseTermsJson as Record<string, any>) || {};

    const context = {
      agreement_date: new Date().toISOString().split('T')[0],
      landlord_name: lease.unit.landlord.fullName,
      landlord_address: lease.unit.landlord.mailingAddress || 'Address on file',
      tenant_name,
      tenant_contact,
      property_address,
      start_date: lease.startDate.toISOString().split('T')[0],
      end_date: lease.endDate.toISOString().split('T')[0],
      renewal_type: lease.renewalType === 'AUTO_MONTH_TO_MONTH' ? 'auto' : 'fixed',
      rent_amount: lease.monthlyRent.toString(),
      deposit_amount: lease.securityDeposit.toString(),
      landlord_signature,
      landlord_signed_date,
      tenant_signature,
      tenant_signed_date,
      ...terms, 
    };

    const templatePath = path.join(__dirname, '..', 'assets', 'lease-template-tokenized.md');
    const templateStr = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateStr);
    const markdownContent = template(context);

    const htmlBody = await marked.parse(markdownContent);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #333; }</style></head>
      <body>
        ${htmlBody}
        <div style="font-size: 8px; color: #999; margin-top: 50px; text-align: right;">Generated at ${new Date().toISOString()} - ${Math.random()}</div>
      </body>
      </html>
    `;

    const fallbackPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: fs.existsSync(fallbackPath) ? fallbackPath : undefined 
    });
    let pdfBuffer: Buffer;
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load' });
      pdfBuffer = Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    } finally {
      await browser.close();
    }

    const fileName = `Lease_${leaseId}_${purpose}.pdf`;
    const file = { buffer: pdfBuffer, originalname: fileName, mimetype: 'application/pdf', size: pdfBuffer.length };
    
    const previousLeaseDoc = lease.leaseDocuments[0]; 

    if (previousLeaseDoc) {
      await this.documentService.uploadVersion(previousLeaseDoc.documentId, file, user);
    } else {
      const newDocument = await this.documentService.upload(file, DocumentCategory.LEASE_AGREEMENT, user);
      // Bypasses documentService.attach() because internal system-generated documents always have a known,
      // valid purpose and lease context — attach()'s stricter permission checks are for user-facing external uploads.
      await this.prisma.leaseDocument.create({
        data: {
          leaseId,
          documentId: newDocument.id,
          purpose,
        }
      });
    }
  }
}
