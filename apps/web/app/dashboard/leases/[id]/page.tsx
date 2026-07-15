'use client';
import * as React from 'react';
import { use } from 'react';
import {
  useLease,
  useTransitionLeaseStatus,
  LeaseStatusTimeline,
  LeaseHistoryTable,
  LeaseStatusBadge,
  useLeaseDocuments,
  LeaseRevenueSplitsCard,
} from '@/features/lease';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';

// ─── Inner page (needs access to toast context) ───────────────────────────────

function LeaseDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const { data: lease, isLoading, error } = useLease(id);
  const { data: documents } = useLeaseDocuments(id);
  const transitionMutation = useTransitionLeaseStatus(id);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<any>(null);
  const [reason, setReason] = React.useState('');

  if (isLoading) {
    return <div className="h-40 w-full bg-secondary animate-pulse rounded-md" />;
  }

  if (error || !lease) {
    return <p className="text-destructive">Failed to fetch lease details.</p>;
  }

  const triggerTransition = (status: any) => {
    setTargetStatus(status);
    setDialogOpen(true);
  };

  const handleConfirmTransition = () => {
    const requestedStatus = targetStatus;
    transitionMutation.mutate(
      { status: requestedStatus, reasonDescription: reason },
      {
        // onSuccess receives the actual server-returned lease object.
        // For the ACTIVE request path this is the critical signal:
        //   - returned status === ACTIVE  → all tenants signed, lease live.
        //   - returned status === PENDING_TENANT_SIGNATURE → partial sign,
        //     signature was recorded but other tenants haven't signed yet.
        onSuccess: (data: any) => {
          setDialogOpen(false);
          setReason('');

          const returnedStatus = data?.status ?? data?.data?.status;

          if (
            requestedStatus === 'ACTIVE' &&
            returnedStatus === 'PENDING_TENANT_SIGNATURE'
          ) {
            // Bug C fix: partial multi-tenant sign — not an error, but the
            // user needs to know their signature was recorded.
            addToast({
              variant: 'info',
              title: 'Signature recorded',
              description:
                'Your signature was saved. The lease will activate once all other tenant(s) sign.',
            });
          } else if (returnedStatus === 'ACTIVE') {
            addToast({
              variant: 'success',
              title: 'Lease activated',
              description: 'All signatures are in — the lease is now active.',
            });
          }
        },
        onError: (err: any) => {
          alert(err.message || 'Status transition failed.');
        },
      },
    );
  };

  const purposeLabels: Record<string, string> = {
    DRAFT_PREVIEW: 'Draft Preview',
    TENANT_SIGNATURE_COPY: 'Tenant Signature Copy',
    EXECUTED: 'Executed Agreement',
  };

  // ─── Tenant signing status panel data ─────────────────────────────────────
  const activeTenants = (lease.leaseTenants ?? []).filter(
    (lt) => lt.status !== 'REMOVED',
  );
  const showSigningPanel =
    lease.status === 'PENDING_TENANT_SIGNATURE' && activeTenants.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Lease Detail <LeaseStatusBadge status={lease.status} />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Property: {lease.unit?.property?.name || 'Unknown'} / Unit:{' '}
            {lease.unit?.unitNumber || lease.unitId}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-lg space-y-6">
        <h2 className="text-lg font-bold text-foreground">Status Lifecycle Timeline</h2>
        <LeaseStatusTimeline currentStatus={lease.status} />
      </div>

      {/* ── Fix 3: Tenant Signing Status Panel ─────────────────────────────── */}
      {showSigningPanel && (
        <div className="bg-card border border-border p-6 rounded-lg space-y-4 text-foreground">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">Tenant Signatures</h3>
            <span className="text-xs text-muted-foreground">
              ({activeTenants.filter((lt) => lt.signedAt).length} of{' '}
              {activeTenants.length} signed)
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {activeTenants.map((lt) => {
              const signed = !!lt.signedAt;
              const signedDate = signed
                ? new Date(lt.signedAt!).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              return (
                <div
                  key={lt.tenantId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    background: signed
                      ? 'color-mix(in srgb, #22c55e 8%, var(--card))'
                      : 'color-mix(in srgb, #f59e0b 8%, var(--card))',
                    border: `1px solid ${signed ? 'color-mix(in srgb, #22c55e 25%, var(--border))' : 'color-mix(in srgb, #f59e0b 25%, var(--border))'}`,
                  }}
                >
                  {/* Status icon */}
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.75rem',
                      height: '1.75rem',
                      borderRadius: '50%',
                      background: signed ? '#22c55e' : '#f59e0b',
                      color: '#fff',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {signed ? '✓' : '⏳'}
                  </span>

                  {/* Name + status */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--foreground)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lt.tenant.fullName}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.78rem',
                        color: signed ? '#16a34a' : '#d97706',
                      }}
                    >
                      {signed ? `Signed ${signedDate}` : 'Awaiting signature'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg space-y-4 text-foreground">
          <h3 className="text-lg font-bold">Lease Details</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Start Date:</span>
            <span>{new Date(lease.startDate).toLocaleDateString()}</span>
            <span className="text-muted-foreground">End Date:</span>
            <span>{new Date(lease.endDate).toLocaleDateString()}</span>
            <span className="text-muted-foreground">Monthly Rent:</span>
            <span>${Number(lease.monthlyRent).toFixed(2)}</span>
            <span className="text-muted-foreground">Security Deposit:</span>
            <span>${Number(lease.securityDeposit).toFixed(2)}</span>
            <span className="text-muted-foreground">Rent Due Day:</span>
            <span>Day {lease.rentDueDay}</span>
            <span className="text-muted-foreground">Grace Period:</span>
            <span>{lease.gracePeriodDays} Days</span>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg space-y-4 text-foreground flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold">Lifecycle Status Transitions</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Progress the contract states using backend validators.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {/* DRAFT — Admin submits for landlord approval */}
            {lease.status === 'DRAFT' && user?.role === 'ADMIN' && (
              <Button variant="default" onClick={() => triggerTransition('PENDING_LANDLORD_APPROVAL')}>
                Submit for Landlord Approval
              </Button>
            )}

            {/* DRAFT — Landlord sends directly to tenant */}
            {lease.status === 'DRAFT' && user?.role === 'LANDLORD' && (
              <Button variant="default" onClick={() => triggerTransition('PENDING_TENANT_SIGNATURE')}>
                Send to Tenant for Signature
              </Button>
            )}

            {/* CANCEL LEASE — Landlord-only proactive cancellation */}
            {['DRAFT', 'PENDING_LANDLORD_APPROVAL', 'PENDING_TENANT_SIGNATURE'].includes(lease.status) &&
              user?.role === 'LANDLORD' && (
                <Button variant="outline" onClick={() => triggerTransition('CANCELLED')}>
                  Cancel Lease
                </Button>
              )}

            {/* PENDING_LANDLORD_APPROVAL — Landlord approves or rejects */}
            {lease.status === 'PENDING_LANDLORD_APPROVAL' && user?.role === 'LANDLORD' && (
              <>
                <Button variant="default" onClick={() => triggerTransition('PENDING_TENANT_SIGNATURE')}>
                  Approve &amp; Send to Tenant
                </Button>
                <Button variant="destructive" onClick={() => triggerTransition('REJECTED')}>
                  Reject
                </Button>
              </>
            )}

            {/* PENDING_TENANT_SIGNATURE — Tenant signs or declines */}
            {lease.status === 'PENDING_TENANT_SIGNATURE' && user?.role === 'TENANT' && (
              <>
                <Button variant="default" onClick={() => triggerTransition('ACTIVE')}>
                  Sign Lease
                </Button>
                <Button variant="destructive" onClick={() => triggerTransition('DECLINED')}>
                  Decline
                </Button>
              </>
            )}

            {/* ACTIVE — Admin requests termination, Landlord terminates directly */}
            {lease.status === 'ACTIVE' && user?.role === 'ADMIN' && (
              <Button variant="destructive" onClick={() => triggerTransition('PENDING_TERMINATION_APPROVAL')}>
                Request Termination
              </Button>
            )}
            {lease.status === 'ACTIVE' && user?.role === 'LANDLORD' && (
              <Button variant="destructive" onClick={() => triggerTransition('TERMINATED')}>
                Terminate Lease
              </Button>
            )}

            {/* PENDING_TERMINATION_APPROVAL — Landlord approves or rejects termination request */}
            {lease.status === 'PENDING_TERMINATION_APPROVAL' && user?.role === 'LANDLORD' && (
              <>
                <Button variant="default" onClick={() => triggerTransition('ACTIVE')}>
                  Reject Termination
                </Button>
                <Button variant="destructive" onClick={() => triggerTransition('TERMINATED')}>
                  Approve Termination
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <LeaseRevenueSplitsCard leaseId={lease.id} />

      {/* Documents Section */}
      <div className="bg-card border border-border p-6 rounded-lg space-y-4 text-foreground">
        <h3 className="text-lg font-bold">Lease Documents</h3>
        {documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">{purposeLabels[doc.purpose] || doc.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()} • {doc.fileName}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => window.open(doc.downloadUrl, '_blank')}>
                  Open PDF
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No documents have been generated for this lease yet.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Transition History Log</h3>
        <LeaseHistoryTable histories={lease.statusHistories || []} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Lifecycle Transition</DialogTitle>
            <DialogDescription>
              Are you sure you want to transition this lease status to{' '}
              <strong>{targetStatus}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <span className="text-sm font-semibold text-foreground block">
              Reason Description (Optional)
            </span>
            <Input
              type="text"
              placeholder="Provide reason for this status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmTransition}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? 'Processing…' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page shell — wraps content with its own ToastProvider ───────────────────

export default function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  return <LeaseDetailContent id={id} />;
}
