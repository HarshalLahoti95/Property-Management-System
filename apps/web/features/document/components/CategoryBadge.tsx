import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { DocumentCategory } from '../types';

export function CategoryBadge({ category }: { category: DocumentCategory }) {
  const labelMap: Record<DocumentCategory, string> = {
    LEASE_AGREEMENT: 'Lease Agreement',
    GOVERNMENT_ID: 'Government ID',
    INVOICE: 'Invoice',
    RECEIPT: 'Receipt',
    DAMAGE_PHOTO: 'Damage Photo',
    OTHER: 'Other',
  };

  const variantMap: Record<
    DocumentCategory,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    LEASE_AGREEMENT: 'default',
    GOVERNMENT_ID: 'outline',
    INVOICE: 'secondary',
    RECEIPT: 'secondary',
    DAMAGE_PHOTO: 'destructive',
    OTHER: 'outline',
  };

  return (
    <Badge variant={variantMap[category]} className="capitalize">
      {labelMap[category] || category}
    </Badge>
  );
}
