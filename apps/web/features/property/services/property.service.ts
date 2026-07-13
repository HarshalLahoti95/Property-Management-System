import { apiClient } from '@/lib/api-client';
import { Property, PropertyQueryFilters } from '../types';
import { PropertyFormValues } from '../schemas';

export const propertyService = {
  async getProperties(filters?: PropertyQueryFilters) {
    const { data } = await apiClient.get<any>('/properties', { params: filters });
    return data.data || data;
  },

  async getProperty(id: string) {
    const { data } = await apiClient.get<Property>(`/properties/${id}`);
    return (data as any)?.data || data;
  },

  async getPropertiesByLandlord() {
    const { data } = await apiClient.get<any>('/properties/by-landlord');
    return data.data || data;
  },

  async createProperty(values: PropertyFormValues) {
    const { data } = await apiClient.post<Property>('/properties', values);
    return data;
  },

  async updateProperty(id: string, values: Partial<PropertyFormValues>) {
    const { data } = await apiClient.patch<Property>(`/properties/${id}`, values);
    return data;
  },

  async deleteProperty(id: string) {
    const { data } = await apiClient.delete(`/properties/${id}`);
    return data;
  },

  async approveDeletion(id: string) {
    const { data } = await apiClient.post(`/properties/${id}/approve-deletion`);
    return data;
  },

  async rejectDeletion(id: string) {
    const { data } = await apiClient.post(`/properties/${id}/reject-deletion`);
    return data;
  },

  async approveUnitDeletion(id: string) {
    const { data } = await apiClient.post(`/units/${id}/approve-deletion`);
    return data;
  },

  async rejectUnitDeletion(id: string) {
    const { data } = await apiClient.post(`/units/${id}/reject-deletion`);
    return data;
  },
};
