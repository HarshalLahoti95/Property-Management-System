import * as React from 'react';
import { Lease } from '../types';
import { LeaseStatusBadge } from './LeaseStatusBadge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function LeaseTable({
  leases = [],
  loading = false,
  onDelete,
}: {
  leases: Lease[];
  loading?: boolean;
  onDelete?: (id: string) => void;
}) {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  const [selectedUser, setSelectedUser] = React.useState<{ type: 'Landlord' | 'Tenant'; data: any } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const openUserDetails = (type: 'Landlord' | 'Tenant', data: any) => {
    setSelectedUser({ type, data });
    setIsDialogOpen(true);
  };
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 w-full bg-secondary animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (leases.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-md text-center bg-card">
        <p className="text-sm text-muted-foreground">No leases match selected filters.</p>
      </div>
    );
  }

  // Group by property -> unit
  const groupedLeases = leases.reduce((acc, lease) => {
    const propName = lease.unit?.property?.name || 'Unknown Property';
    const unitName = lease.unit?.unitNumber || lease.unitId;
    
    if (!acc[propName]) acc[propName] = {};
    if (!acc[propName][unitName]) acc[propName][unitName] = [];
    
    acc[propName][unitName].push(lease);
    return acc;
  }, {} as Record<string, Record<string, Lease[]>>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedLeases).map(([propName, units]) => (
        <div key={propName} className="border border-border rounded-md bg-card overflow-hidden shadow-sm">
          <div className="bg-muted px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-lg">{propName}</h3>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(units).map(([unitName, unitLeases]) => (
              <div key={unitName} className="p-0">
                <div className="bg-muted/30 px-4 py-2 border-b border-border/50">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-door-closed"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg>
                    Unit: {unitName}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground bg-card">
                        {role !== 'LANDLORD' && <th className="p-3 font-medium">Landlord</th>}
                        <th className="p-3 font-medium">Tenants</th>
                        <th className="p-3 font-medium">Monthly Rent</th>
                        <th className="p-3 font-medium">Duration</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 text-foreground bg-card">
                      {unitLeases.map((l) => {
                        const landlordData = l.landlord || (l.unit as any)?.landlord;
                        return (
                          <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                            {role !== 'LANDLORD' && (
                              <td className="p-3">
                                {landlordData?.fullName ? (
                                  <div className="flex flex-col">
                                    <button 
                                      onClick={() => openUserDetails('Landlord', landlordData)}
                                      className="font-medium text-left hover:underline text-primary"
                                    >
                                      {landlordData.fullName}
                                    </button>
                                    <span className="text-xs text-muted-foreground">{landlordData.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">N/A</span>
                                )}
                              </td>
                            )}
                            <td className="p-3">
                              {l.leaseTenants?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {l.leaseTenants.map((lt) => (
                                    <button 
                                      key={lt.tenantId} 
                                      onClick={() => openUserDetails('Tenant', lt.tenant)}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                                    >
                                      {lt.tenant?.fullName || 'Unknown'}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">No Tenants</span>
                              )}
                            </td>
                            <td className="p-3 font-medium">₹{Number(l.monthlyRent).toFixed(2)}</td>
                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                              {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <LeaseStatusBadge status={l.status} />
                            </td>
                            <td className="p-3 text-right space-x-2 whitespace-nowrap">
                              <Link href={`/dashboard/leases/${l.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                              {l.status === 'DRAFT' && (
                                <>
                                  <Link href={`/dashboard/leases/${l.id}/edit`}>
                                    <Button variant="outline" size="sm">
                                      Edit
                                    </Button>
                                  </Link>
                                  {onDelete && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this draft lease?')) {
                                          onDelete(l.id);
                                        }
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser?.type} Details</DialogTitle>
          </DialogHeader>
          {selectedUser?.data ? (
            <div className="space-y-3 mt-4">
              <div>
                <span className="text-sm text-muted-foreground block">Full Name</span>
                <span className="font-medium text-foreground">{selectedUser.data.fullName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Email</span>
                <span className="font-medium text-foreground">{selectedUser.data.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Phone</span>
                <span className="font-medium text-foreground">{selectedUser.data.phone || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-muted-foreground text-sm">
              No details available.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
