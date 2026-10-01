import type { MonitoringScheduleDetail, MonitoringScheduleSummary } from '@/lib/api/sc-monitoring';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { Routes } from '@/routes/constants';

export function monitoringScheduleLabel(schedule?: MonitoringScheduleSummary) {
  if (schedule?.status === 'not_applicable' && schedule.clientStatus === 'pending') return 'Monitoring starts when this client is activated';
  if (schedule?.status === 'not_applicable' && ['inactive', 'archived'].includes(schedule.clientStatus || '')) return 'Monitoring paused for this client';
  return ({ not_configured: 'Monitoring schedule not configured', disabled: 'Monitoring schedule disabled', not_applicable: 'Monitoring schedule not applicable', unavailable: 'Monitoring schedule unavailable', upcoming: 'Next monitoring contact', due_soon: 'Monitoring contact due soon', due_today: 'Monitoring contact due today', overdue: 'Monitoring contact overdue' })[schedule?.status || 'unavailable'];
}
export default function MonitoringScheduleCard({ schedule, onRefresh, agencyView = false }: { schedule?: MonitoringScheduleDetail; onRefresh?: () => void; agencyView?: boolean }) {
  return <section className="mb-5 rounded-xl border border-[#dce6e7] bg-white p-5 text-[#16383b]" aria-label="Monitoring schedule">
    <h2 className="text-lg font-semibold">{monitoringScheduleLabel(schedule)}</h2>
    {schedule?.status === 'not_applicable' && <p className="mt-2 text-sm text-[#617579]">{schedule.clientStatus === 'pending' ? 'Enrollment is pending. An agency administrator or authorized staff member must review enrollment and activate this client before contact deadlines are calculated.' : schedule.clientStatus === 'inactive' || schedule.clientStatus === 'archived' ? `Client status: ${schedule.clientStatus}. Contact deadlines apply only to active SC clients. Ask your agency administrator to review this client’s status.` : 'Contact deadlines apply only to active clients enrolled in Support Coordination. Ask your agency administrator to review this client’s enrollment and status.'}</p>}
    {(schedule?.status === 'not_configured' || schedule?.status === 'disabled') && <p className="mt-2 text-sm text-[#617579]">{schedule.status === 'not_configured' ? 'Your agency has not set up monitoring contact schedules.' : 'Your agency has turned off monitoring contact schedules.'} An agency administrator can enable them in Monitoring Settings on Client Management.</p>}
    {agencyView && (schedule?.status === 'not_configured' || schedule?.status === 'disabled') && <Button asChild variant="outline" className="mt-3"><Link to={Routes.agency.clients}>Go to Client Management</Link></Button>}
    {schedule?.nextMonitoringDueDate && <p className="mt-2 font-semibold">Due {schedule.nextMonitoringDueDate}{schedule.status === 'overdue' && ` · ${schedule.overdueDays} ${schedule.overdueDays === 1 ? 'day' : 'days'} overdue`}</p>}
    {schedule?.intervalDays && <p className="mt-2 text-sm">Every {schedule.intervalDays} days · {schedule.timezone}. Qualifying methods: {schedule.qualifyingMethods?.map(value => value.replaceAll('_', ' ')).join(', ')}. {schedule.requireDirectContact ? 'Direct contact required.' : 'Direct contact optional.'}</p>}
    {schedule?.latestQualifyingContactAt && <p className="mt-2 text-sm">Latest qualifying contact: {new Date(schedule.latestQualifyingContactAt).toLocaleString('en-US', { timeZone: schedule.timezone || 'UTC' })}</p>}
    <p className="mt-2 text-sm text-[#617579]">Follow-ups keep their own due dates. Completing a follow-up does not reset this schedule.</p>
    {(!schedule || schedule.status === 'unavailable') && onRefresh && <Button className="mt-3" variant="outline" onClick={onRefresh}>Refresh monitoring</Button>}
  </section>;
}
