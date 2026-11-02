import {useState} from 'react';
import {addDays, format, isSameDay} from 'date-fns';
import {CalendarSearch} from 'lucide-react';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';

interface Props {
    /** First day shown in the strip. */
    windowStart: Date;
    days: number;
    selected: Date;
    onSelect: (date: Date) => void;
}

/** Selected date with a calendar jump, and a strip of days to switch between. */
export default function DayStrip({windowStart, days, selected, onSelect}: Props) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const today = new Date();
    const dates = Array.from({length: days}, (_, index) => addDays(windowStart, index));

    return <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
                <button type="button" aria-label={`Selected day ${format(selected, 'EEEE, MMMM d')}. Pick another day`}
                    className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[6px] px-1 text-[16px] font-medium text-[#10141a] hover:text-[#007679] focus-visible:outline-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7] dark:hover:text-[#7fe0e2]">
                    {format(selected, 'EEE, MMM d')}
                    <CalendarSearch className="h-[18px] w-[18px]" aria-hidden="true"/>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selected} defaultMonth={selected} autoFocus
                    onSelect={date => { if (date) { onSelect(date); setPickerOpen(false); } }}/>
            </PopoverContent>
        </Popover>

        <div role="group" aria-label="Choose a day" className="-mx-1 flex max-w-full gap-0.5 overflow-x-auto px-1 py-1 scrollbar-hide sm:gap-1.5">
            {dates.map(date => {
                const isSelected = isSameDay(date, selected);
                const isToday = isSameDay(date, today);
                return <button key={date.toISOString()} type="button" onClick={() => onSelect(date)}
                    aria-pressed={isSelected} aria-label={`${format(date, 'EEEE, MMMM d')}${isToday ? ' (today)' : ''}`}
                    className={cn(
                        'relative flex h-[52px] w-11 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full border text-[#10141a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7]',
                        isSelected
                            ? 'border-[#00a3a7] bg-[#e3f6f6] text-[#005759] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]'
                            : 'border-transparent hover:bg-[#f1f6f7] dark:hover:bg-white/5',
                    )}>
                    {isToday && <span className="absolute right-1 top-0.5 h-2 w-2 rounded-full bg-[#20a35c]" aria-hidden="true"/>}
                    <span className="text-[16px] font-medium leading-tight">{format(date, 'd')}</span>
                    <span className={cn('text-[12px] leading-tight', isSelected ? 'font-medium' : 'text-[#5d6b73] dark:text-[#9aa4a8]')}>{format(date, 'EEE')}</span>
                </button>;
            })}
        </div>
    </div>;
}
