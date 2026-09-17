import type {ClientComplianceArgs, ClientCompliancePage, ClientChecklistItem, UnsignedForm485Client} from './apiTypes';
import { ShiftNoteComplianceArgs, ShiftNoteComplianceResponse, ShiftNoteComplianceDetail } from './apiTypes';
import { useEffect } from 'react';
import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {ExpiredDocumentsResponse, UnsignedForm485Response, DocumentComplianceArgs, DocumentComplianceResponse, DocumentComplianceSettings} from "./apiTypes";

export const complianceAlertsApi = createApi({
    reducerPath: "complianceAlertsApi",
    baseQuery: customBaseQuery,
    tagTypes: ['ExpiredDocuments', 'UnsignedForm485', 'DocumentCompliance', 'DocumentComplianceSettings', 'ShiftNoteCompliance'],
    keepUnusedDataFor: 300,
    endpoints: (builder) => ({
        getClientChecklistPage: builder.query<ClientCompliancePage<ClientChecklistItem>, ClientComplianceArgs>({
            query: ({scopeKey: _scopeKey, limit = 25, ...params}) => ({url: '/clients/compliance/document-checklist', method: 'GET', params: {...params, limit: Math.min(25, Math.max(1, limit))}, requiresAuth: true}),
        }),
        getUnsignedForm485Page: builder.query<ClientCompliancePage<UnsignedForm485Client>, Omit<ClientComplianceArgs, 'search' | 'status'>>({
            query: ({scopeKey: _scopeKey, limit = 25, ...params}) => ({url: '/clients/compliance/unsigned-form485-page', method: 'GET', params: {...params, limit: Math.min(25, Math.max(1, limit))}, requiresAuth: true}),
            providesTags: ['UnsignedForm485'],
        }),
        getShiftNoteCompliance: builder.query<ShiftNoteComplianceResponse, ShiftNoteComplianceArgs>({
            query: ({scopeKey: _scopeKey, viewerId: _viewerId, limit = 25, ...params}) => ({url: '/shifts/note-compliance', method: 'GET', params: {...params, limit: Math.min(50, Math.max(1, limit))}, requiresAuth: true}),
            providesTags: ['ShiftNoteCompliance'],
        }),
        getShiftNoteComplianceDetail: builder.query<ShiftNoteComplianceDetail, {scopeKey?: string; shiftId: string; viewerId: string; agencyId: string; mode?: string; employeeId?: string}>({
            query: ({shiftId, scopeKey: _scopeKey, viewerId: _viewerId, ...params}) => ({url: `/shifts/${encodeURIComponent(shiftId)}/note-compliance`, method: 'GET', params, requiresAuth: true}),
            providesTags: ['ShiftNoteCompliance'],
        }),
        getDocumentComplianceSettings: builder.query<DocumentComplianceSettings, {viewerId: string; agencyId?: string}>({
            query: () => ({url: '/documents/compliance/settings', method: 'GET', requiresAuth: true}),
            providesTags: ['DocumentComplianceSettings'],
        }),
        updateDocumentComplianceSettings: builder.mutation<DocumentComplianceSettings, {enabled: boolean}>({
            query: (data) => ({url: '/documents/compliance/settings', method: 'PUT', data, requiresAuth: true}),
            invalidatesTags: ['DocumentComplianceSettings', 'DocumentCompliance'],
        }),
        getDocumentCompliance: builder.query<DocumentComplianceResponse, DocumentComplianceArgs>({
            query: ({scopeKey: _scopeKey, viewerId: _viewerId, ...params}) => ({url: '/documents/compliance', method: 'GET', params, requiresAuth: true}),
            providesTags: ['DocumentCompliance'],
        }),
        getExpiredDocuments: builder.query<ExpiredDocumentsResponse, { agencyId: string; mode?: string }>({
            query: ({ agencyId, mode }) => ({
                url: "/documents/expired",
                method: "GET",
                params: { agencyId, ...(mode ? { mode } : {}) },
                requiresAuth: true
            }),
            providesTags: ['ExpiredDocuments']
        }),

        getUnsignedForm485Clients: builder.query<UnsignedForm485Response, { agencyId: string; mode?: string }>({
            query: ({ agencyId, mode }) => ({
                url: "/clients/compliance/unsigned-form485",
                method: "GET",
                params: { agencyId, ...(mode ? { mode } : {}) },
                requiresAuth: true
            }),
            providesTags: ['UnsignedForm485']
        }),

    }),
});

export const { useGetClientChecklistPageQuery, useGetUnsignedForm485PageQuery,
    useGetShiftNoteComplianceQuery,
    useGetShiftNoteComplianceDetailQuery,
    useGetDocumentComplianceSettingsQuery,
    useUpdateDocumentComplianceSettingsMutation,
    useGetDocumentComplianceQuery,
    useGetExpiredDocumentsQuery,
    useGetUnsignedForm485ClientsQuery,
} = complianceAlertsApi;

// Refresh a visible view when the agency's civil date changes (including after sleep).
export function useComplianceDateRefresh(timezone: string | null | undefined, refresh: () => unknown, localDate?: string | null) {
    useEffect(() => {
        if (!timezone) return;
        const date = () => new Intl.DateTimeFormat('en-CA', {timeZone: timezone}).format(new Date());
        let previous = localDate || date();
        const check = () => {
            if (document.visibilityState === 'hidden') return;
            const next = date();
            if (next !== previous) { previous = next; refresh(); }
        };
        check();
        const timer = window.setInterval(check, 30_000);
        document.addEventListener('visibilitychange', check);
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
    }, [timezone, refresh, localDate]);
}
