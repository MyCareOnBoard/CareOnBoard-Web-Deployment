import {useId} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
export function CprRequirementField({value,onChange,disabled=false}:{value?:boolean;onChange:(value:boolean|undefined)=>void;disabled?:boolean}) {
 const id=useId();return <div className="flex flex-wrap items-center gap-3 py-2"><label htmlFor={id} className="text-sm font-semibold text-[#10141a]">Does this service require CPR-trained staff?</label><Select value={value===undefined?'unknown':value?'yes':'no'} disabled={disabled} onValueChange={next=>onChange(next==='unknown'?undefined:next==='yes')}><SelectTrigger id={id} className="w-[150px] rounded-xl border-[#cccccd]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unknown">Not recorded</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>;
}
