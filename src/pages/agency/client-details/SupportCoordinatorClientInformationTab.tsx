import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog, ConfirmDialogContent } from '@/components/ui/confirm-dialog';
import { type Client, useUpdateClientMutation, useDeleteClientMutation } from '@/lib/api/clients';
import { useToast } from '@/hooks/use-toast';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useAuth } from '@/utils/auth';
import { Routes } from '@/routes/constants';
import { ProfileSectionCard } from '@/pages/shared/client-details/components/ProfileSectionCard';
import { buildProfileSections } from '@/pages/shared/client-details/tabs/profileTabViewModel';

type Action = 'activate' | 'deactivate' | 'delete';
const confirmations = {
  activate: { title: 'Activate this client?', label: 'Activate client', description: 'Confirm that you have reviewed enrollment and this client is ready for active services. Existing agency requirements still apply. For SC clients, monitoring follows the agency’s settings and keeps existing enrollment and contact dates, so a contact may already be due.' },
  deactivate: { title: 'Deactivate this client?', label: 'Deactivate client', description: 'This will mark the client as inactive and may affect access to services. SC contact deadlines will pause. Existing contacts and follow-ups will be kept.' },
  delete: { title: 'Delete this client?', label: 'Delete client', description: 'This will archive the client and remove them from active client lists. Existing records are retained. Active services and assignments may be affected.' },
};
export type ClientInformationProps = {
  client: Client;
  formatDate: (dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date) => string;
  clientId: string;
  onClientUpdated: (client: Client) => void;
  readOnly?: boolean;
};
export default function SupportCoordinatorClientInformationTab(props: ClientInformationProps) {
  const scope = useAssignmentReviewScope();
  return <ClientInformation key={`${scope}:${props.clientId}`} {...props} />;
}
function ClientInformation({ client, formatDate, clientId, onClientUpdated, readOnly = false }: ClientInformationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [update] = useUpdateClientMutation();
  const [remove] = useDeleteClientMutation();
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const sections = useMemo(() => {
    const fields = buildProfileSections(client, formatDate).filter(section => section.id !== 'assigned-dsps');
    fields.splice(1, 0, { id: 'sc-enrollment', title: 'Support Coordination enrollment', fields: [
      { label: 'Program', value: client.scEnrollment?.program || client.ispMetadata?.program || 'Not set', icon: 'layers' },
      { label: 'Support coordinator', value: client.supportCoordinatorName || (client.supportCoordinatorId ? 'Assigned' : 'Not assigned'), icon: 'users' },
      { label: 'Agreement signed', value: formatDate(client.scEnrollment?.signedOn), icon: 'calendar' },
      { label: 'ISP start', value: formatDate(client.ispPeriod?.startDate), icon: 'calendar' },
      { label: 'ISP end', value: formatDate(client.ispPeriod?.endDate), icon: 'calendar' },
    ] });
    return fields;
  }, [client, formatDate]);
  const isScClient = client.servicePrograms?.includes('sc');
  const canManage = !readOnly && isScClient && Boolean(user?.agencyId) && user?.agencyId === client.agencyId && user?.profile?.isActive !== false
    && !['inactive', 'suspended'].includes(user?.profile?.status || '')
    && (user?.userType === 'agency' || (user?.userType === 'agency_staff'
      && user.profile?.accessList?.includes('Client Management')
      && user.profile?.agencyModes?.includes('sc')));
  const canDelete = canManage && user?.userType === 'agency' && client.status !== 'archived';
  const statusAction = client.status === 'active' ? 'deactivate' : client.status === 'pending' || client.status === 'inactive' ? 'activate' : null;
  const open = (next: Action) => { setError(''); setAction(next); };
  const confirm = async () => {
    if (!action || busy || error || !canManage || (action === 'delete' ? !canDelete : action !== statusAction)) return;
    setBusy(true); setError('');
    let saved: Client | undefined;
    try {
      if (action === 'delete') {
        const result = await remove({ clientId, agencyId: client.agencyId }).unwrap();
        if (!result.success) throw new Error('Deletion was not confirmed.');
      } else {
        const status = action === 'activate' ? 'active' : 'inactive';
        const result = await update({ clientId, data: { status } }).unwrap();
        if (!result.success || result.data?.status !== status) throw new Error('Status change was not confirmed.');
        saved = result.data;
      }
    } catch {
      if (!alive.current) return;
      setAction(null);
      setError('The change could not be confirmed. Refresh this page to check the client’s status before trying again.');
      toast({ title: 'Could not confirm client change', description: 'Refresh this page to check the client’s status.', variant: 'destructive' });
      setBusy(false);
      return;
    }
    if (saved) onClientUpdated(saved);
    if (!alive.current) return;
    setAction(null);
    toast({ title: action === 'activate' ? 'Client activated' : action === 'deactivate' ? 'Client deactivated' : 'Client deleted', description: action === 'delete' ? 'The client was archived; existing records are retained.' : 'The client’s status was updated.', variant: 'success' });
    if (action === 'delete') navigate(Routes.agency.clients);
    if (alive.current) setBusy(false);
  };
  return <section aria-labelledby="client-information-heading" className="space-y-5 py-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="client-information-heading" className="text-2xl font-semibold text-[#10141a]">Client Information</h2><p className="mt-1 text-sm text-[#617579]">Review client details and manage enrollment.</p><Badge variant="outline" className="mt-3 capitalize">{client.status || 'Status not set'}</Badge></div>
      {canManage && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => navigate(Routes.agency.editClient.replace(':clientId', clientId))}>Edit Client</Button>
        {statusAction && <Button variant={statusAction === 'activate' ? 'default' : 'outline'} disabled={busy || Boolean(error)} onClick={() => open(statusAction)}>{confirmations[statusAction].label}</Button>}
        {canDelete && <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" disabled={busy || Boolean(error)} onClick={() => open('delete')}>Delete client</Button>}
      </div>}
    </div>
    {error && !action && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">{sections.map(section => <ProfileSectionCard key={section.id} section={section} />)}</div>
    <ConfirmDialog open={Boolean(action && canManage)} onOpenChange={isOpen => { if (!isOpen && !busy) setAction(null); }}>
      <ConfirmDialogContent title={action ? confirmations[action].title : undefined} description={action ? confirmations[action].description : undefined}
        confirmText={action ? confirmations[action].label : 'Confirm'} confirmVariant={action === 'activate' ? 'default' : 'destructive'}
        cancelText="Not now" onCancel={() => { if (!busy) setAction(null); }} onConfirm={() => void confirm()} isLoading={busy} loadingText="Saving…" aria-busy={busy}
        onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }} />
    </ConfirmDialog>
  </section>;
}
