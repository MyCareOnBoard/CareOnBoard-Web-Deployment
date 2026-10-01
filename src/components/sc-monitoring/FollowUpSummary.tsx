import { ArrowRight, CalendarDays, UserRound } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { ScFollowUp } from '@/lib/api/sc-monitoring';

const categories: Record<string, string> = { service: 'Service delivery', experience: 'Client experience', safety: 'Health and safety', changed_needs: 'Changed needs', provider: 'Provider issue' };

export default function FollowUpSummary({ detail }: { detail: ScFollowUp }) {
  const dueDate = parseISO(detail.dueDate);
  return <Card className="gap-4 rounded-2xl border-[#dce6e7] bg-white py-5 text-[#17383b] shadow-none sm:py-6">
    <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6">
      <h2 className="text-[19px] font-semibold">Issue and action</h2>
      <div className="flex flex-wrap gap-2"><Badge variant="info" className="py-1.5 text-[13px]">{categories[detail.category] || detail.category.replaceAll('_', ' ')}</Badge><Badge variant={detail.priority === 'urgent' ? 'error' : 'outline'} className="py-1.5 text-[13px]">{detail.priority[0].toUpperCase() + detail.priority.slice(1)} priority</Badge></div>
    </CardHeader>
    <CardContent className="space-y-5 px-5 sm:px-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 py-3"><dt className="mb-2 text-[13px] font-medium text-[#687b7e]">Issue</dt><dd className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{detail.description || 'No issue description recorded.'}</dd></div>
        <div className="min-w-0 rounded-xl border border-[#cce8e8] bg-[#f0fafa] p-4"><dt className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#087f82]"><ArrowRight className="size-4" aria-hidden="true" />Next action</dt><dd className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-relaxed">{detail.action || 'No next action recorded.'}</dd></div>
      </dl>
      <dl className="grid gap-4 border-t border-[#e7eeee] pt-4 sm:grid-cols-2">
        <div className="min-w-0"><dt className="flex items-center gap-2 text-[13px] font-medium text-[#687b7e]"><UserRound className="size-4 shrink-0" aria-hidden="true" />Responsible person</dt><dd className="mt-1 break-words text-[15px] font-medium">{detail.responsiblePerson || 'Current Support Coordinator'}</dd><dd className="mt-1 text-[13px] text-[#687b7e]">For reference; this does not assign a task.</dd></div>
        <div className="min-w-0"><dt className="flex items-center gap-2 text-[13px] font-medium text-[#687b7e]"><CalendarDays className="size-4 shrink-0" aria-hidden="true" />Due date</dt><dd className="mt-1 flex flex-wrap items-center gap-2 text-[15px] font-medium"><time dateTime={isValid(dueDate) ? detail.dueDate : undefined}>{isValid(dueDate) ? format(dueDate, 'MMM d, yyyy') : 'Not set'}</time>{detail.overdue && <Badge variant="error" className="px-2 py-1 text-[13px]">Overdue</Badge>}</dd></div>
      </dl>
    </CardContent>
  </Card>;
}
