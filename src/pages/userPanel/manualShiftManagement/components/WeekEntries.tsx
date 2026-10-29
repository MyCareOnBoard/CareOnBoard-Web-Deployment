import {Clock, X} from 'lucide-react';
import TimePicker from '@/components/TimePicker';
import CustomDatePicker from '@/components/ui/datePicker';
import {cn} from '@/lib/utils';
import {dateFromKey, entryDateLabel, to12Hour, to24Hour, weekFrom, weekHours, type DayEntry, type TimesheetWeek} from '../timesheetEntries';

const fieldClass = 'flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-[#dfe5e7] bg-white px-3.5 text-left text-sm text-[#10141a] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]';

function TimeField({label, value, placeholder, onChange}: {label: string; value: string; placeholder: string; onChange: (value: string) => void}) {
    return <div className="relative">
        <TimePicker value={to24Hour(value)} onChange={time => onChange(to12Hour(time))}>
            <button type="button" aria-label={`${label}${value ? `, ${value}` : ''}`}
                className={cn(fieldClass, 'cursor-pointer hover:border-[#00a3a7] focus-visible:outline-2 focus-visible:outline-[#007679]', value && 'pr-12')}>
                <span className={cn('truncate', !value && 'text-[#8a99a3]')}>{value || placeholder}</span>
                {!value && <Clock className="h-5 w-5 shrink-0 text-[#34434c] dark:text-[#c9d3d6]" aria-hidden="true"/>}
            </button>
        </TimePicker>
        {value && <button type="button" onClick={() => onChange('')} aria-label={`Clear ${label}`}
            className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-[#5d6b73] hover:bg-[#f1f6f7] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:bg-white/5">
            <X className="h-4 w-4" aria-hidden="true"/>
        </button>}
    </div>;
}

interface Props {
    weekNumber: number;
    week: TimesheetWeek;
    onChange: (week: TimesheetWeek) => void;
    onRemove?: () => void;
}

export default function WeekEntries({weekNumber, week, onChange, onRemove}: Props) {
    const setEntry = (date: string, patch: Partial<DayEntry>) =>
        onChange({...week, entries: week.entries.map(entry => entry.date === date ? {...entry, ...patch} : entry)});
    const hours = weekHours(week);

    return <section aria-labelledby={`week-${weekNumber}-title`} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e6ecee] pb-4 dark:border-white/10">
            <div className="min-w-0 flex-1 basis-64">
                <h3 id={`week-${weekNumber}-title`} className="text-base font-bold text-[#10141a] dark:text-[#f4f6f7]">Timesheet Entries From Week {weekNumber}</h3>
                <p className="mt-1 text-[13px] text-[#34434c] dark:text-[#c9d3d6]">These entries are not changeable once you input them. Please fill out carefully</p>
                {onRemove && <button type="button" onClick={onRemove} className="mt-1 cursor-pointer text-[13px] font-semibold text-[#b3371c] hover:underline dark:text-[#f3a08c]">Remove week {weekNumber}</button>}
            </div>
            <div className="w-full sm:w-[230px]">
                <p className="mb-1.5 text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Start date</p>
                <CustomDatePicker
                    date={week.startDate ? dateFromKey(week.startDate) : null}
                    setDate={date => onChange(date ? weekFrom(date, week.entries) : {startDate: '', entries: []})}
                    placeholder={`Select week ${weekNumber} start date`}
                    ariaLabel={`Week ${weekNumber} start date`}
                    iconVariant="calendar-2"
                    endMonth={new Date()}
                    align="end"
                    className="h-11 min-h-11 rounded-[10px] border-[#dfe5e7] px-3"
                    inputClassName="text-sm"
                />
            </div>
        </div>

        {week.entries.length > 0 && <>
            <div className="flex flex-col gap-4">
                {week.entries.map(entry => <div key={entry.date} className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3 md:gap-x-4">
                    <div className="col-span-2 md:col-span-1">
                        <p className="mb-1.5 text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Date</p>
                        <p className={cn(fieldClass, 'bg-[#f6f9f9] dark:bg-white/5')}>{entryDateLabel(entry.date)}</p>
                    </div>
                    <div>
                        <p className="mb-1.5 text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Check in</p>
                        <TimeField label={`Check in, ${entryDateLabel(entry.date)}`} value={entry.checkIn} placeholder="-- Select start time --"
                            onChange={checkIn => setEntry(entry.date, {checkIn})}/>
                    </div>
                    <div>
                        <p className="mb-1.5 text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Check out</p>
                        <TimeField label={`Check out, ${entryDateLabel(entry.date)}`} value={entry.checkOut} placeholder="-- Select end time --"
                            onChange={checkOut => setEntry(entry.date, {checkOut})}/>
                    </div>
                </div>)}
            </div>
            <p className="text-right text-sm font-semibold text-[#34434c] dark:text-[#c9d3d6]">Week {weekNumber} total: {hours} {hours === 1 ? 'hour' : 'hours'}</p>
        </>}
    </section>;
}
