export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL';
export type PropertyLayout = 'STANDALONE' | 'MULTI_UNIT';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  layout: PropertyLayout;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
  deletionStatus?: 'PENDING_ADMIN_APPROVAL' | 'PENDING_LANDLORD_APPROVAL' | 'APPROVED' | 'REJECTED';
  deletionRequestedByRole?: string;
  units?: any[];
}

export interface PropertyQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: PropertyType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LandlordGroup {
  landlordId: string;
  landlord: {
    id: string;
    fullName: string;
    email: string;
  };
  properties: Property[];
}
