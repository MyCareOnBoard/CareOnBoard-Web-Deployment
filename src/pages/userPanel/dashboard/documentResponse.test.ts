import {describe, expect, it} from 'vitest';
import {normalizeDocumentResponse} from './documentResponse';
import type {GetEmployeeDocumentsResponse} from './types';

const record: GetEmployeeDocumentsResponse = {id:'doc',documentId:'doc',employeeId:'employee',documentType:'diploma',
    fileUrl:'https://example.com/diploma.pdf?token=example',status:'available',uploadDate:'2026-09-21',expiryDate:null};

describe('document response compatibility', () => {
    it('normalizes legacy file metadata while retaining the original download URL', () => {
        expect(normalizeDocumentResponse([record])[0].fileUrl).toBe(record.fileUrl);
        expect(normalizeDocumentResponse([{...record,fileUrl:{fileUrl:record.fileUrl,fileName:'diploma.pdf'}}])[0].fileUrl).toBe(record.fileUrl);
        expect(normalizeDocumentResponse({data:[]})).toEqual([]);
    });
    it('never exposes object, relative, or executable links for navigation', () => {
        for (const fileUrl of [{}, {fileUrl:{}}, '[object Object]', 'javascript:alert(1)', null]) {
            expect(normalizeDocumentResponse([{...record,fileUrl}])[0].fileUrl).toBe('');
        }
    });
});
