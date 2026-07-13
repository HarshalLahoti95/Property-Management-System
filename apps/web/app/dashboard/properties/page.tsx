'use client';
import * as React from 'react';
import { useProperties, usePropertiesByLandlord, useCreateProperty, useUpdateProperty, useDeleteProperty, useApprovePropertyDeletion, useRejectPropertyDeletion, useApproveUnitDeletion, useRejectUnitDeletion } from '@/features/property/hooks/use-properties';
import { useAuth } from '@/hooks/use-auth';
import { PropertyTable } from '@/features/property/components/PropertyTable';
import { PropertyForm } from '@/features/property/components/PropertyForm';
import { PropertyFormValues } from '@/features/property/schemas';
import { Property } from '@/features/property/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function PropertiesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data: properties, isLoading: isLoadingProperties } = useProperties();
  const { data: groupedProperties, isLoading: isLoadingGrouped } = usePropertiesByLandlord();

  const isLoading = isAdmin ? isLoadingGrouped : isLoadingProperties;

  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty(); // Fixed signature
  const deleteProperty = useDeleteProperty();
  const approveDeletion = useApprovePropertyDeletion();
  const rejectDeletion = useRejectPropertyDeletion();
  const approveUnitDeletion = useApproveUnitDeletion();
  const rejectUnitDeletion = useRejectUnitDeletion();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingProperty, setEditingProperty] = React.useState<Property | null>(null);

  const handleCreate = (values: PropertyFormValues) => {
    createProperty.mutate(values, {
      onSuccess: () => {
        setIsDialogOpen(false);
      }
    });
  };

  const handleUpdate = (values: PropertyFormValues) => {
    if (editingProperty) {
      updateProperty.mutate({ id: editingProperty.id, values }, {
        onSuccess: () => setIsDialogOpen(false)
      });
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      deleteProperty.mutate(id);
    }
  };

  const handleApproveDeletion = (id: string) => {
    approveDeletion.mutate(id);
  };

  const handleRejectDeletion = (id: string) => {
    rejectDeletion.mutate(id);
  };

  const handleApproveUnitDeletion = (id: string) => {
    approveUnitDeletion.mutate(id);
  };

  const handleRejectUnitDeletion = (id: string) => {
    rejectUnitDeletion.mutate(id);
  };

  const openCreateDialog = () => {
    setEditingProperty(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Properties</h1>
          <p className="text-sm text-muted-foreground">Manage your real estate portfolio.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Property
        </Button>
      </div>

      {isLoading ? (
        <div className="h-64 bg-card border border-border rounded-xl animate-pulse" />
      ) : (
        <PropertyTable 
          properties={isAdmin ? undefined : (properties || [])}
          groupedProperties={isAdmin ? (groupedProperties || []) : undefined}
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          onApproveDeletion={handleApproveDeletion}
          onRejectDeletion={handleRejectDeletion}
          onApproveUnitDeletion={handleApproveUnitDeletion}
          onRejectUnitDeletion={handleRejectUnitDeletion}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>
          <PropertyForm
            defaultValues={editingProperty || undefined}
            onSubmit={editingProperty ? handleUpdate : handleCreate}
            submitLabel={editingProperty ? 'Save Changes' : 'Create Property'}
            isAdmin={isAdmin}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
