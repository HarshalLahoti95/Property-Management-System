import * as React from 'react';
import { LeaseStatus } from '../types';

const steps: LeaseStatus[] = ['DRAFT', 'PENDING_LANDLORD_APPROVAL', 'PENDING_TENANT_SIGNATURE', 'ACTIVE'];

const stepLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_LANDLORD_APPROVAL: 'Landlord Approval',
  PENDING_TENANT_SIGNATURE: 'Tenant Signature',
  ACTIVE: 'Active',
};

export function LeaseStatusTimeline({ currentStatus }: { currentStatus: LeaseStatus }) {
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto py-6">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <React.Fragment key={step}>
            {idx > 0 && (
              <div
                className={`flex-1 h-1 transition-colors duration-300 ${
                  isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs border-2 transition-all ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary text-primary bg-card ring-4 ring-primary/20'
                      : 'border-muted text-muted-foreground bg-card'
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-[10px] md:text-xs mt-2 font-medium text-center max-w-[80px] ${
                  isCurrent ? 'text-primary font-bold' : 'text-foreground'
                }`}
              >
                {stepLabels[step] || step}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
