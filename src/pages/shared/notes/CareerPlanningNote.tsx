import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { noteTimedFields } from '@/lib/notes/noteTypes';
import type {
  CareerRow,
  CareerRevision,
  CareerSnapshot,
  CareerSignatureHeader,
} from '@/lib/api/career-planning';
import { useGetCareerSignaturesQuery, useGetCareerSignatureQuery } from '@/pages/userPanel/notes/api';

/** Candidate instants must round-trip through the agency zone, including DST gaps and repeats. */
export function careerTimeCandidates(civil: string, timezone: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(civil)) return [];
  const base = Date.parse(civil + 'Z');
  if (!Number.isFinite(base)) return [];
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const local = (ms: number) => formatter.format(new Date(ms)).replace(' ', 'T');
    const offsets = new Set(
      [-86400000, 0, 86400000].map((delta) => Date.parse(local(base + delta) + 'Z') - (base + delta)),
    );
    return [...offsets]
      .map((offset) => base - offset)
      .filter((ms) => local(ms) === civil)
      .sort((a, b) => a - b)
      .map((ms) => new Date(ms).toISOString());
  } catch {
    return [];
  }
}
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-label={label} className="w-full justify-start">
            {value || 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ? new Date(value + 'T12:00:00') : undefined}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
function TimeField({
  label,
  value,
  timezone,
  onChange,
}: {
  label: string;
  value: string;
  timezone: string;
  onChange: (value: string) => void;
}) {
  const parsed = noteTimedFields(value, timezone);
  const [date, setDate] = useState(parsed.date ? format(parsed.date, 'yyyy-MM-dd') : '');
  const [time, setTime] = useState(parsed.time);
  const candidates = careerTimeCandidates(`${date}T${time}`, timezone);
  function change(d: string, t: string) {
    setDate(d);
    setTime(t);
    const values = careerTimeCandidates(`${d}T${t}`, timezone);
    onChange(values.length === 1 ? values[0] : '');
  }
  return (
    <div className="space-y-2">
      <DateField label={`${label} date`} value={date} onChange={(d) => change(d, time)} />
      <label className="block">
        {label} time
        <Input type="time" value={time} onChange={(e) => change(date, e.target.value)} />
      </label>
      {date && time && candidates.length === 0 && (
        <p role="alert">This time does not exist in {timezone}. Choose a valid time.</p>
      )}
      {candidates.length > 1 && (
        <label>
          Repeated time — choose occurrence
          <select
            className="w-full rounded border bg-background p-2"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Choose occurrence</option>
            {candidates.map((instant) => (
              <option key={instant} value={instant}>
                {new Intl.DateTimeFormat('en-US', {
                  timeZone: timezone,
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'longOffset',
                }).format(new Date(instant))}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
type Props = { rows: CareerRow[]; revision?: CareerRevision | null; timezone?: string; showTotal?: boolean } & (
  | { readOnly: true; onChange?: never }
  | { readOnly: false; onChange: (rows: CareerRow[]) => void }
);
export function CareerPlanningNote(props: Props) {
  const { rows, revision, timezone } = props;
  function update(id: string, patch: Partial<CareerRow>) {
    if (!props.readOnly) props.onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  return (
    <div className="space-y-4">
      {revision && (
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">Plan revision {revision.revisionNumber}</h3>
          <p>
            Plan period: {revision.content.periodStart} – {revision.content.periodEnd}
          </p>
          <p>Published: {revision.publishedAt}</p>
        </div>
      )}
      {timezone && <p>Service times: {timezone}</p>}
      {rows.map((row, index) => {
        const locked = props.readOnly || row.status === 'submitted' || row.status === 'approved';
        const m = row.metadata;
        return (
          <fieldset key={row.id} data-note-id={row.id} className="space-y-4 rounded-2xl border p-4">
            <legend className="font-semibold">
              Entry {index + 1}
              {row.status && row.status !== 'active' ? ` · ${row.status}` : ''}
            </legend>
            {locked ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <p>Service date: {m.serviceDate || 'Not recorded'}</p>
                <p>Start: {row.startDate || 'Not recorded'}</p>
                <p>End: {row.endDate || 'Not recorded'}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div data-note-field="serviceDate">
                  <DateField
                    label="Service date"
                    value={m.serviceDate ?? ''}
                    onChange={(serviceDate) => update(row.id, { metadata: { ...m, serviceDate } })}
                  />
                </div>
                <div data-note-field="startDate">
                  <TimeField
                    key={`${row.id}:${row.contentVersion}:start`}
                    label="Start"
                    value={row.startDate}
                    timezone={timezone ?? ''}
                    onChange={(startDate) => update(row.id, { startDate })}
                  />
                </div>
                <div data-note-field="endDate">
                  <TimeField
                    key={`${row.id}:${row.contentVersion}:end`}
                    label="End"
                    value={row.endDate}
                    timezone={timezone ?? ''}
                    onChange={(endDate) => update(row.id, { endDate })}
                  />
                </div>
              </div>
            )}
            <div data-note-field="goalIds">
              <h4 className="font-semibold">Goal</h4>
              {revision?.content.goals.map((goal) => (
                <label key={goal.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={m.goalIds?.includes(goal.id) ?? false}
                    onChange={(e) =>
                      update(row.id, {
                        metadata: {
                          ...m,
                          goalIds: e.target.checked
                            ? [...(m.goalIds ?? []), goal.id]
                            : (m.goalIds ?? []).filter((id) => id !== goal.id),
                        },
                      })
                    }
                  />
                  <span>{goal.statement}</span>
                </label>
              ))}
              {!revision && <p>Goals will be available after a published plan is selected.</p>}
            </div>
            {(
              [
                ['location', 'Location'],
                ['supportProvided', 'Support provided'],
                ['responseAndProgress', 'Response and progress'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block" data-note-field={key}>
                {label}
                <Textarea
                  maxLength={10000}
                  readOnly={locked}
                  value={m[key] ?? ''}
                  onChange={(e) => update(row.id, { metadata: { ...m, [key]: e.target.value } })}
                />
              </label>
            ))}
            <label className="block" data-note-field="recordedUnits">
              Recorded units (15-minute units)
              <Input
                type="number"
                min={1}
                step={1}
                readOnly={locked}
                value={m.recordedUnits ?? ''}
                onChange={(e) =>
                  update(row.id, {
                    metadata: {
                      ...m,
                      recordedUnits: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Enter the units recorded for this service. CareOnBoard does not calculate billable units here.
            </p>
          </fieldset>
        );
      })}
      {props.showTotal !== false && (
        <p className="font-semibold">
          Recorded units: {rows.reduce((sum, row) => sum + (row.metadata.recordedUnits ?? 0), 0)}
        </p>
      )}
    </div>
  );
}
export function CareerSignedContent({
  snapshot,
  signature,
}: {
  snapshot: CareerSnapshot;
  signature?: CareerSignatureHeader;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Career Planning</h2>
      <p>Individual: {snapshot.context.clientName}</p>
      <p>Documenting employee: {snapshot.context.employeeName}</p>
      <p>Service: {snapshot.context.serviceCode}</p>
      <CareerPlanningNote readOnly rows={snapshot.rows} revision={snapshot.revision} />
      {signature && (
        <div className="rounded-xl border p-4">
          <p>
            Signed by {signature.employeeName} · {signature.signedAt}
          </p>
          <p>{signature.attestation}</p>
        </div>
      )}
    </section>
  );
}
export function CareerSignatureHistory({ activityLogId }: { activityLogId: string }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<string>();
  const [receiptId, setReceiptId] = useState('');
  const list = useGetCareerSignaturesQuery({ activityLogId, cursor }, { skip: !open });
  const detail = useGetCareerSignatureQuery({ activityLogId, receiptId }, { skip: !receiptId });
  return (
    <section className="space-y-3">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        Signature history
      </Button>
      {open && (
        <>
          {list.isFetching && <p>Loading signatures…</p>}
          {list.isError && <p role="alert">Unable to load signature history. Please try again.</p>}
          {list.currentData?.items.map((header) => (
            <div key={header.id}>
              <Button variant="ghost" onClick={() => setReceiptId(header.id)}>
                {header.employeeName} · {header.signedAt}
              </Button>
            </div>
          ))}
          {list.currentData?.items.length === 0 && <p>No signatures yet.</p>}
          {cursor && (
            <Button variant="outline" onClick={() => setCursor(undefined)}>
              First signatures
            </Button>
          )}
          {list.currentData?.nextCursor && (
            <Button variant="outline" onClick={() => setCursor(list.currentData!.nextCursor!)}>
              Next signatures
            </Button>
          )}
          {detail.isError && <p role="alert">This signed entry could not be verified. Try again.</p>}
          {detail.currentData && (
            <CareerSignedContent
              snapshot={detail.currentData.snapshot}
              signature={detail.currentData.signature}
            />
          )}
        </>
      )}
    </section>
  );
}
export default CareerPlanningNote;
