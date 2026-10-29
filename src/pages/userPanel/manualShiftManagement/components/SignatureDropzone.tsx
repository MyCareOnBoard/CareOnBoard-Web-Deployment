import {useId, useRef, useState, type DragEvent} from 'react';
import {CloudUpload, FileText} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {Signature} from '../timesheetEntries';

/** The signature endpoint stores PNG, JPEG and PDF; 5 MB keeps the base64 request under the API limit. */
const ACCEPTED = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024;

const isPdf = (signature: Signature) => /^data:application\/pdf|\.pdf(\?|$)/i.test(signature.signatureData);

function SignaturePreview({signature}: {signature: Signature}) {
    if (signature.signatureType === 'type') {
        return <p className="max-w-full break-words text-center text-3xl leading-tight text-[#10141a] dark:text-[#f4f6f7]" style={{fontFamily: 'Brush Script MT, cursive'}}>
            {signature.signatureData}
        </p>;
    }
    if (isPdf(signature)) {
        return <span className="flex items-center gap-2 text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">
            <FileText className="h-6 w-6 text-[#007679]" aria-hidden="true"/> Signed PDF attached
        </span>;
    }
    return <img src={signature.signatureData} alt="Signature" className="max-h-[90px] max-w-full object-contain"/>;
}

interface Props {
    /** "client signature" / "your signature" */
    label: string;
    signature: Signature | null;
    onChange: (signature: Signature) => void;
    onError: (message: string) => void;
    /** Opens the draw / type signature pad. */
    onDraw: () => void;
}

/** Click or drop a signature file; drawing or typing it stays available. */
export default function SignatureDropzone({label, signature, onChange, onError, onDraw}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const hintId = useId();

    const readFile = (file?: File) => {
        if (!file) return;
        if (!ACCEPTED.includes(file.type)) return onError('Upload a PNG, JPG or PDF file.');
        if (file.size > MAX_BYTES) return onError('That file is over 5 MB. Upload a smaller one.');
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') onChange({signatureType: 'upload', signatureData: reader.result});
        };
        reader.onerror = () => onError('That file could not be read. Try another one.');
        reader.readAsDataURL(file);
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        readFile(event.dataTransfer.files?.[0]);
    };

    return <div className="flex flex-col gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} aria-describedby={hintId}
            onDragOver={event => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)} onDrop={onDrop}
            className={cn('flex min-h-[112px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border bg-white px-4 py-4 text-center transition-colors focus-visible:outline-2 focus-visible:outline-[#007679] dark:bg-transparent',
                dragging ? 'border-[#00a3a7] bg-[#f2fafa] dark:bg-[#00a3a7]/10' : 'border-[#dfe5e7] hover:border-[#00a3a7] dark:border-white/15')}>
            {signature ? <>
                <SignaturePreview signature={signature}/>
                <span className="text-[13px] font-semibold text-[#007679] dark:text-[#7fe0e2]">Replace {label}</span>
            </> : <>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f1f6f7] text-[#34434c] dark:bg-white/10 dark:text-[#c9d3d6]"><CloudUpload className="h-5 w-5" aria-hidden="true"/></span>
                <span className="text-sm text-[#34434c] dark:text-[#c9d3d6]">
                    <span className="font-semibold text-[#007679] dark:text-[#7fe0e2]">Click to upload</span> or drag and drop {label}
                </span>
                <span id={hintId} className="text-xs text-[#5d6b73] dark:text-[#9aa4a8]">PNG, JPG or PDF (max. 5 MB)</span>
            </>}
        </button>
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" className="hidden"
            aria-label={`Upload ${label}`} onChange={event => { readFile(event.target.files?.[0]); event.target.value = ''; }}/>
        <button type="button" onClick={onDraw} className="cursor-pointer self-center text-[13px] font-semibold text-[#007679] hover:underline dark:text-[#7fe0e2]">
            Or draw / type {label}
        </button>
    </div>;
}
