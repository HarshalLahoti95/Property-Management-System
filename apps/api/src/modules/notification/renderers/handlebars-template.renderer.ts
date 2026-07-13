import { Injectable } from '@nestjs/common';
import { TemplateRenderer } from '../interfaces/template-renderer.interface';

@Injectable()
export class HandlebarsTemplateRenderer implements TemplateRenderer {
  private readonly templates: Record<string, string> = {
    'OTP': '<h3>One-Time Password (OTP)</h3><p>Hello,</p><p>Your verification code is: <strong>{{otp}}</strong></p><p>This code expires in 5 minutes.</p>',
    'PASSWORD_RESET': '<h3>Password Reset Request</h3><p>Hello,</p><p>You requested a password reset. Use link below to reset:</p><p><a href="{{resetLink}}">Reset Password</a></p>',
    'LEASE_ACTIVATED': '<h3>Lease Activated</h3><p>Hello,</p><p>Your lease for unit <strong>{{unitName}}</strong> is now active!</p>',
    'LEASE_TERMINATED': '<h3>Lease Terminated</h3><p>Hello,</p><p>Your lease for unit <strong>{{unitName}}</strong> has been terminated.</p>',
    'PAYMENT_RECEIPT': '<h3>Payment Receipt</h3><p>Hello,</p><p>We received your payment of <strong>${{amount}}</strong> via {{method}}.</p><p>Transaction reference: {{reference}}</p>',
    'REFUND': '<h3>Refund Confirmation</h3><p>Hello,</p><p>A refund of <strong>${{amount}}</strong> has been issued for transaction {{reference}}.</p>',
    'MAINTENANCE_CREATED': '<h3>Maintenance Request Created</h3><p>Hello,</p><p>A new maintenance request <strong>"{{title}}"</strong> has been submitted.</p>',
    'MAINTENANCE_ASSIGNED': '<h3>Maintenance Request Assigned</h3><p>Hello,</p><p>The maintenance request <strong>"{{title}}"</strong> has been assigned to a vendor.</p>',
    'MAINTENANCE_COMPLETED': '<h3>Maintenance Request Completed</h3><p>Hello,</p><p>The maintenance request <strong>"{{title}}"</strong> has been completed.</p>',
    'DOCUMENT_UPLOADED': '<h3>Document Uploaded</h3><p>Hello,</p><p>A new document <strong>"{{fileName}}"</strong> has been uploaded.</p>',
  };

  async render(templateName: string, data: any): Promise<string> {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template with name ${templateName} not found.`);
    }

    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : '';
    });
  }
}
