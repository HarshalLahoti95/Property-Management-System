export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type WorkOrderStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CANCELLED';

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  specialty: string;
}

export interface WorkOrderComment {
  id: string;
  workOrderId: string;
  authorId: string;
  commentText: string;
  createdAt: string;
  author?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export interface WorkOrderStatusHistory {
  id: string;
  workOrderId: string;
  oldStatus: WorkOrderStatus | null;
  newStatus: WorkOrderStatus;
  changedByUserId: string;
  reasonDescription: string | null;
  changedAt: string;
  changedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  assignedVendor?: Vendor | null;
  previousVendor?: Vendor | null;
}

export interface WorkOrder {
  id: string;
  propertyId: string;
  unitId: string | null;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  estimatedCost: number | null;
  actualCost: number | null;
  targetCompletionDate: string | null;
  completedAt: string | null;
  vendorId: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    name: string;
    address: string;
  };
  unit?: {
    id: string;
    unitNumber: string;
  } | null;
  vendor?: Vendor | null;
  comments?: WorkOrderComment[];
  statusHistory?: WorkOrderStatusHistory[];
}
