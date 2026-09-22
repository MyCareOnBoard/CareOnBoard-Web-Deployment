import {useEffect, useState} from 'react';
import {useAuth} from '@/utils/auth';
import {Button} from '@/components/ui/button';
import NotificationPreferencesTab from '@/pages/shared/settings/NotificationPreferencesTab';
import SettingsSectionCard from '@/pages/shared/settings/SettingsSectionCard';
import {settingsActionBtnClass, settingsAlertErrorClass} from '@/pages/shared/settings/settingsCardStyles';
import {useGetDocumentComplianceSettingsQuery, useUpdateDocumentComplianceSettingsMutation} from '@/pages/agency/compliance-alerts/api';

function ComplianceMonitoringSettings({active, viewerId, agencyId}: {active: boolean; viewerId: string; agencyId?: string}) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [withinSetupWindow, setWithinSetupWindow] = useState(false);
  const [actionError, setActionError] = useState(false);
  const {data, isLoading, isFetching, isError, refetch} = useGetDocumentComplianceSettingsQuery(
    {viewerId, agencyId},
    {skip: !active, pollingInterval: active && withinSetupWindow ? 5_000 : 0, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnMountOrArgChange: true},
  );
  const [update, {isLoading: saving}] = useUpdateDocumentComplianceSettingsMutation();
  useEffect(() => {
    if (data?.state === 'baselining') setDeadline(previous => previous ?? Date.now() + 60_000);
    else if (data) setDeadline(null);
  }, [data?.state]);
  useEffect(() => {
    if (deadline === null || isError) {setWithinSetupWindow(false); return;}
    setWithinSetupWindow(Date.now() < deadline);
    const timer = window.setTimeout(() => setWithinSetupWindow(false), Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [deadline, isError]);
  const changeMonitoring = async (enabled: boolean) => {
    setActionError(false);
    try {
      const result = await update({enabled}).unwrap();
      setDeadline(result.state === 'baselining' ? Date.now() + 60_000 : null);
    } catch {setActionError(true);}
  };
  const settingUp = data?.state === 'baselining';
  return <SettingsSectionCard title="Compliance monitoring" subtitle="Monitor document expiry, training and CPR deadlines, client requirements, and missing shift notes.">
    <div className="space-y-3">
      {isLoading && <p role="status" className="text-sm text-[#808081]">Loading compliance monitoring settings...</p>}
      {(isError || actionError) && <div role="alert" className={settingsAlertErrorClass}>
        <span>{actionError ? "We couldn't update compliance monitoring. Please try again." : "We couldn't load compliance monitoring settings."}</span>
        {isError && <Button type="button" variant="outline" className={settingsActionBtnClass} onClick={() => refetch()}>Retry</Button>}
      </div>}
      {data && <>
        <p role="status" className="text-sm font-medium text-[#10141a]">{settingUp ? 'Setting up compliance monitoring' : data.state === 'active' ? 'Compliance monitoring is enabled' : data.state === 'paused' ? 'Compliance monitoring is paused' : 'Compliance monitoring is not enabled'}</p>
        <p className="text-[13px] text-[#808081]">Existing issues are grouped into one catch-up summary. Shift-note reminders start from activation; individual notification preferences still apply.</p>
        {!data.canEnable && data.state !== 'active' && !settingUp && <p className="text-[13px] text-[#808081]">{data.message || 'Set a valid agency timezone in Agency Information before enabling compliance monitoring.'}</p>}
        {settingUp ? !withinSetupWindow && <Button type="button" variant="outline" className={settingsActionBtnClass} disabled={isFetching} onClick={() => refetch()}>Refresh</Button> : <Button type="button" className={settingsActionBtnClass} variant={data.state === 'active' ? 'outline' : 'default'} disabled={saving || isFetching || isError || (data.state !== 'active' && !data.canEnable)} onClick={() => changeMonitoring(data.state !== 'active')}>
          {saving ? 'Saving...' : data.state === 'active' ? 'Pause' : data.state === 'paused' ? 'Resume' : 'Enable compliance monitoring'}
        </Button>}
      </>}
    </div>
  </SettingsSectionCard>;
}

export default function AgencyNotificationTab({active = true}: {active?: boolean}) {
  const {user} = useAuth();
  return <div className="space-y-4">
    <NotificationPreferencesTab />
    {user?.userType === 'agency' && user.uid && <ComplianceMonitoringSettings key={`${user.uid}:${user.agencyId}`} active={active} viewerId={user.uid} agencyId={user.agencyId} />}
  </div>;
}
