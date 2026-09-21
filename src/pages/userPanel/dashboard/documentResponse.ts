import type {GetEmployeeDocumentsResponse} from './types';

type RawDocument = Omit<GetEmployeeDocumentsResponse, 'fileUrl'> & {fileUrl: unknown};

// Keep compatibility with legacy API responses until all environments are deployed.
export function normalizeDocumentResponse(response: RawDocument[] | {data: RawDocument[]}): GetEmployeeDocumentsResponse[] {
    const documents = Array.isArray(response) ? response : response.data;
    return documents.map(document => {
        const file = document.fileUrl;
        const value = typeof file === 'string' ? file
            : file && typeof file === 'object' && 'fileUrl' in file ? file.fileUrl : '';
        let fileUrl = '';
        if (typeof value === 'string') {
            try {
                const url = new URL(value);
                if (url.protocol === 'https:' || url.protocol === 'http:') fileUrl = url.href;
            } catch { /* Invalid stored links must not open a relative [object Object] route. */ }
        }
        return {...document, fileUrl};
    });
}
