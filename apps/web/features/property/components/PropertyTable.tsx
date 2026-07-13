'use client';
import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Property, LandlordGroup } from '../types';
import { Button } from '@/components/ui/button';
import { AddUnitModal } from './AddUnitModal';
import { Plus, ChevronDown, ChevronRight, Home, User, AlertTriangle } from 'lucide-react';

interface PropertyTableProps {
  properties?: Property[];
  groupedProperties?: LandlordGroup[];
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onApproveDeletion?: (id: string) => void;
  onRejectDeletion?: (id: string) => void;
  onApproveUnitDeletion?: (id: string) => void;
  onRejectUnitDeletion?: (id: string) => void;
}

export function PropertyTable({ properties, groupedProperties, onEdit, onDelete, onApproveDeletion, onRejectDeletion, onApproveUnitDeletion, onRejectUnitDeletion }: PropertyTableProps) {
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<string | null>(null);
  const [expandedPropertyIds, setExpandedPropertyIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (propertyId: string) => {
    const newExpanded = new Set(expandedPropertyIds);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedPropertyIds(newExpanded);
  };

  const hasNoData = (!properties || properties.length === 0) && (!groupedProperties || groupedProperties.length === 0);

  if (hasNoData) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-lg shadow-sm">
        <p className="text-muted-foreground mb-4">No properties found.</p>
      </div>
    );
  }

  const renderPropertyRow = (property: Property, isGrouped: boolean = false) => (
    <React.Fragment key={property.id}>
      <tr className={`hover:bg-muted/50 transition-colors ${isGrouped ? 'bg-muted/10' : ''}`}>
        <td className={`px-4 py-4 cursor-pointer ${isGrouped ? 'pl-8' : ''}`} onClick={() => toggleExpand(property.id)}>
          {expandedPropertyIds.has(property.id) ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
        <td className="px-6 py-4 font-medium text-foreground">{property.name}</td>
        <td className="px-6 py-4">{property.type}</td>
        <td className="px-6 py-4">
          {property.streetAddress}<br />
          <span className="text-xs text-muted-foreground">{property.city}, {property.state} {property.zipCode}</span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none bg-primary/10 text-primary rounded-full">
            {property.units?.length || 0}
          </span>
        </td>
        <td className="px-6 py-4 text-right space-x-2">
          {property.deletionStatus ? (
            <div className="flex items-center justify-end space-x-2">
              <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {property.deletionStatus.replace(/_/g, ' ')}
              </span>
              {(user?.role === 'ADMIN' && property.deletionStatus === 'PENDING_ADMIN_APPROVAL') ||
               (user?.role === 'LANDLORD' && property.deletionStatus === 'PENDING_LANDLORD_APPROVAL') ? (
                <>
                  <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => onApproveDeletion?.(property.id)}>Approve</Button>
                  <Button variant="outline" size="sm" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => onRejectDeletion?.(property.id)}>Reject</Button>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {property.layout !== 'STANDALONE' && (
                <Button variant="secondary" size="sm" onClick={() => setSelectedPropertyId(property.id)}>
                  <Plus className="mr-1 h-3 w-3" /> Add Unit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onEdit(property)}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(property.id)}>Delete</Button>
            </>
          )}
        </td>
      </tr>
      {expandedPropertyIds.has(property.id) && (
        <tr className="bg-muted/10 border-b-0">
          <td colSpan={6} className="p-0">
            <div className={`px-10 py-4 ${isGrouped ? 'pl-16' : ''}`}>
              {property.units && property.units.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {property.units.map((unit) => (
                    <div key={unit.id} className="bg-background border rounded-lg p-3 shadow-sm flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Home className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Unit {unit.unitNumber}</h4>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Rent: ₹{Number(unit.targetRent).toLocaleString()}</span>
                          <span>{unit.bedCount} Bed / {unit.bathCount} Bath</span>
                          <span>{unit.squareFootage} sq ft</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            unit.occupancyStatus === 'VACANT' ? 'bg-green-100 text-green-800' :
                            unit.occupancyStatus === 'OCCUPIED' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {unit.occupancyStatus}
                          </span>
                          
                          {unit.deletionStatus && (
                            <div className="flex flex-col items-end gap-1">
                              <span className="flex items-center text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {unit.deletionStatus.replace(/_/g, ' ')}
                              </span>
                              {((user?.role === 'ADMIN' && unit.deletionStatus === 'PENDING_ADMIN_APPROVAL') ||
                               (user?.role === 'LANDLORD' && unit.deletionStatus === 'PENDING_LANDLORD_APPROVAL')) && (
                                <div className="flex gap-1 mt-1">
                                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0 border-green-500 text-green-600 hover:bg-green-50" onClick={() => onApproveUnitDeletion?.(unit.id)}>Approve</Button>
                                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0 border-red-500 text-red-600 hover:bg-red-50" onClick={() => onRejectUnitDeletion?.(unit.id)}>Reject</Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 italic">No units configured for this property.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  return (
    <>
      <div className="overflow-x-auto bg-card border border-border rounded-lg shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3 text-center">Units</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groupedProperties ? (
              groupedProperties.map(group => (
                <React.Fragment key={group.landlordId}>
                  <tr className="bg-secondary/50 border-y border-border">
                    <td colSpan={6} className="px-6 py-3 font-semibold text-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Landlord: {group.landlord.fullName}</span>
                        <span className="text-xs font-normal text-muted-foreground mx-2">({group.landlord.email})</span>
                      </div>
                    </td>
                  </tr>
                  {group.properties.map(property => renderPropertyRow(property, true))}
                </React.Fragment>
              ))
            ) : (
              properties?.map((property) => renderPropertyRow(property))
            )}
          </tbody>
        </table>
      </div>

      {selectedPropertyId && (
        <AddUnitModal
          propertyId={selectedPropertyId}
          isOpen={true}
          onClose={() => setSelectedPropertyId(null)}
        />
      )}
    </>
  );
}
