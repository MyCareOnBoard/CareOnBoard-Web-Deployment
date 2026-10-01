import type { MonitoringScheduleDetail, MonitoringScheduleSummary } from '@/lib/api/sc-monitoring';
import { Button } from '@/components/ui/button';

export function monitoringScheduleLabel(schedule?: MonitoringScheduleSummary) {
  return ({ not_configured: 'Monitoring schedule not configured', disabled: 'Monitoring schedule disabled', not_applicable: 'Monitoring schedule not applicable', unavailable: 'Monitoring schedule unavailable', upcoming: 'Next monitoring contact', due_soon: 'Monitoring contact due soon', due_today: 'Monitoring contact due today', overdue: 'Monitoring contact overdue' })[schedule?.status || 'unavailable'];
}
export default function MonitoringScheduleCard({ schedule, onRefresh }: { schedule?: MonitoringScheduleDetail; onRefresh?: () => void }) {
  return <section className="mb-5 rounded-xl border border-[#dce6e7] bg-white p-5 text-[#16383b]" aria-label="Monitoring schedule">
    <h2 className="text-lg font-semibold">{monitoringScheduleLabel(schedule)}</h2>
    {schedule?.nextMonitoringDueDate && <p className="mt-2 font-semibold">Due {schedule.nextMonitoringDueDate}{schedule.status === 'overdue' && ` · ${schedule.overdueDays} ${schedule.overdueDays === 1 ? 'day' : 'days'} overdue`}</p>}
    {schedule?.intervalDays && <p className="mt-2 text-sm">Every {schedule.intervalDays} days · {schedule.timezone}. Qualifying methods: {schedule.qualifyingMethods?.map(value => value.replaceAll('_', ' ')).join(', ')}. {schedule.requireDirectContact ? 'Direct contact required.' : 'Direct contact optional.'}</p>}
    {schedule?.latestQualifyingContactAt && <p className="mt-2 text-sm">Latest qualifying contact: {new Date(schedule.latestQualifyingContactAt).toLocaleString('en-US', { timeZone: schedule.timezone || 'UTC' })}</p>}
    <p className="mt-2 text-sm text-[#617579]">Follow-ups keep their own due dates. Completing a follow-up does not reset this schedule.</p>
    {(!schedule || schedule.status === 'unavailable') && onRefresh && <Button className="mt-3" variant="outline" onClick={onRefresh}>Refresh monitoring</Button>}
  </section>;
}
