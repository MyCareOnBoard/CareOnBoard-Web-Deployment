import {useEffect, useRef, useState} from 'react';
import {Upload, FileCheck2} from 'lucide-react';
import axiosClient from '@/lib/axios';
import {DocumentPreviewModal} from '@/components/documents/DocumentPreviewModal';
import {Button} from '@/components/ui/button';
import type {TrainingData} from './trainingApi';
import {TrainingDateField, TrainingPolicyStatus} from './TrainingPolicyFields';

type CertificateResult = Pick<TrainingData, 'certificateId' | 'certificateName' | 'status' | 'approved' | 'completedAt'>;
interface Props {
    training: TrainingData;
    canEditHireDate?: boolean;
    showPolicySummary?: boolean;
    dashboard?: boolean;
    onUploaded?: (certificate: CertificateResult) => void;
}

export default function TrainingCertificate({training, onUploaded, canEditHireDate=false, showPolicySummary=true, dashboard=false}: Props) {
    const [selection, setSelection] = useState<{file: File; requestId: string} | null>(null);
    const [uploading, setUploading] = useState(false);
    const [completedOnDate,setCompletedOnDate] = useState('');
    const [printedExpiryDate,setPrintedExpiryDate] = useState('');
    const [previewCertificate,setPreviewCertificate] = useState<string | null>(null);
    const selectedCertificateId = previewCertificate === 'accepted' ? training.acceptedCertificate?.id : training.certificateId;
    const policy = training.source === 'policy' && training.policyContextState === 'current';
    const changeDate = (setter: (value: string) => void, value: string) => {setter(value); setSelection(current => current ? {...current, requestId: crypto.randomUUID()} : null);};
    const [error, setError] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [preview, setPreview] = useState<{url?: string; error?: string; loading: boolean}>({loading: false});
    const uploadController = useRef<AbortController | null>(null);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => () => uploadController.current?.abort(), [training.id]);
    useEffect(() => {
        if (!previewOpen || !training.id || !selectedCertificateId) return;
        const controller = new AbortController();
        let objectUrl: string | undefined;
        setPreview({loading: true});
        axiosClient.get<Blob>(`/employees/trainings/${training.id}/certificate`, {
            params: {certificateId: selectedCertificateId}, responseType: 'blob', signal: controller.signal,
        }).then(({data}) => {
            if (controller.signal.aborted) return;
            objectUrl = URL.createObjectURL(data);
            setPreview({url: objectUrl, loading: false});
        }).catch(() => {
            if (!controller.signal.aborted) setPreview({loading: false, error: 'Unable to open this certificate. Close the preview and try again.'});
        });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [previewOpen, training.id, selectedCertificateId]);

    const upload = async () => {
        if (!selection || !training.id || uploadController.current) return;
        const controller = new AbortController();
        uploadController.current = controller;
        setUploading(true);
        setError(null);
        const data = new FormData();
        data.append('file', selection.file);
        data.append('requestId', selection.requestId);
        if (policy) { data.append('completedOnDate',completedOnDate); if (printedExpiryDate) data.append('printedExpiryDate',printedExpiryDate); }
        try {
            const result = await axiosClient.post<CertificateResult>(`/employees/trainings/${training.id}/certificate`, data, {signal: controller.signal});
            if (controller.signal.aborted) return;
            onUploaded?.(result.data);
            setSelection(null);
            if (input.current) input.current.value = '';
        } catch {
            if (!controller.signal.aborted) setError('Certificate not uploaded. Try again with the selected file.');
        } finally {
            uploadController.current = null;
            if (!controller.signal.aborted) setUploading(false);
        }
    };

    return <div className={dashboard ? "flex w-full flex-col items-stretch gap-4 text-sm empty:hidden" : "flex flex-col items-start gap-2 text-sm empty:hidden"}>
        {training.certificateId && <Button type="button" variant="ghost" className="h-auto px-0 text-[#008f92]" onClick={() => {setPreviewCertificate('latest');setPreviewOpen(true);}}>
            View certificate
        </Button>}
        <TrainingPolicyStatus training={training} canEditHireDate={canEditHireDate} showSummary={showPolicySummary}/>
        {policy && training.acceptedCertificate && training.acceptedCertificate.id !== training.certificateId && <Button type="button" variant="ghost" className="h-auto px-0 text-[#008f92]" onClick={()=>{setPreviewCertificate('accepted');setPreviewOpen(true);}}>View accepted certificate</Button>}
        {onUploaded && (training.source !== 'policy' || policy) && <>
            {policy && <div className={dashboard ? "flex flex-wrap gap-3 [&>div]:min-w-0 [&>div]:flex-1 [&_button]:w-full [&_button]:justify-start [&_button]:bg-white" : "flex flex-wrap gap-3"}><TrainingDateField label="Completion date" value={completedOnDate} onChange={value=>changeDate(setCompletedOnDate,value)} disabled={uploading}/>{training.requirementId==='cpr-certification' && <TrainingDateField label="Printed expiry date (optional)" value={printedExpiryDate} onChange={value=>changeDate(setPrintedExpiryDate,value)} disabled={uploading}/>}</div>}
            <label className={dashboard ? "relative flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[#b7cccf] bg-white p-5 text-center text-[#596065] focus-within:ring-2 focus-within:ring-[#00b4b8]" : "flex max-w-full flex-col gap-1 text-[#596065]"}>
                {dashboard && (selection ? <FileCheck2 aria-hidden="true" className="h-6 w-6 text-[#00858a]"/> : <Upload aria-hidden="true" className="h-6 w-6 text-[#687e82]"/>)}
                <span className={dashboard ? 'font-semibold text-[#007f83]' : undefined}>{training.certificateId ? 'Replace completion certificate' : 'Upload completion certificate'}</span>
                {dashboard && <span className="max-w-full break-all text-xs">{selection ? selection.file.name : 'Choose a PDF, JPG, PNG or WEBP · Up to 10 MB'}</span>}
                <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={uploading}
                    aria-label={training.certificateId ? 'Replace completion certificate' : 'Upload completion certificate'}
                    className={dashboard ? "absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait" : "max-w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-[#e5f7f7] file:px-3 file:py-2 file:text-[#008f92]"}
                    onChange={event => {
                        const file = event.target.files?.[0];
                        setError(null);
                        setSelection(null);
                        if (!file) return;
                        if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
                            setError('Choose a PDF, JPEG, PNG, or WEBP file up to 10 MB.');
                            event.target.value = '';
                            return;
                        }
                        setSelection({file, requestId: crypto.randomUUID()});
                    }}/>
            </label>
            {!dashboard && <p className="text-xs text-[#808081]">PDF, JPEG, PNG, or WEBP, up to 10 MB. Agency approval is required.</p>}
            {(selection || dashboard) && <Button type="button" disabled={!selection || uploading || policy && !completedOnDate} className={dashboard ? "h-auto w-full rounded-xl bg-[#00b4b8] px-4 py-3 text-white hover:bg-[#009da1] disabled:opacity-50" : "h-auto rounded-full bg-[#00b4b8] px-4 py-2 text-white hover:bg-[#009da1]"} onClick={upload}>
                {uploading ? 'Uploading certificate…' : dashboard ? 'Submit for review' : 'Submit certificate'}
            </Button>}
            {dashboard && <p className="text-center text-xs text-[#596065]">Your agency reviews the certificate before approval.</p>}
            {error && <p role="alert" className="text-[#d53411]">{error}</p>}
        </>}
        <DocumentPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} title={`${training.name} certificate`}
            fileName={training.certificateName ?? undefined} url={preview.url} isLoading={preview.loading} error={preview.error}/>
    </div>;
}
