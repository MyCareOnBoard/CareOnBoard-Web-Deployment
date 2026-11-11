import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DropdownMenu, DropdownMenuContent} from '@/components/ui/dropdown-menu';
import {NotificationItem} from './NotificationItem';
import type {Notification} from '@/lib/hooks/useNotifications';

const base: Notification = {id: 'n1', title: 'Document Request', message: 'Your agency has requested: Drug Test', type: 'documents_requested', category: 'documents', priority: 'normal', status: 'unread', cleared: false, createdAt: new Date().toISOString()};
function click(notification: Notification) {
 const onNavigate = vi.fn();
 render(<DropdownMenu open><DropdownMenuContent><NotificationItem notification={notification} onMarkAsRead={vi.fn()} onNavigate={onNavigate} onClose={vi.fn()}/></DropdownMenuContent></DropdownMenu>);
 fireEvent.click(screen.getByText('Document Request'));
 return onNavigate;
}

describe('NotificationItem', () => {
 it('sends old document requests to the dashboard Documents section instead of the missing /documents page', () => {
  expect(click({...base, actionUrl: '/documents'})).toHaveBeenCalledWith('/user-panel/dashboard?section=documents');
 });
 it('sends old document upload notices to the DSP list instead of a missing page', () => {
  expect(click({...base, type: 'employee_document_uploaded', actionUrl: '/employees/uid-1/documents'})).toHaveBeenCalledWith('/agency/dsp-management');
 });
 it('follows the link a new document request carries', () => {
  const url = '/user-panel/dashboard?section=documents&documentType=drug-test';
  expect(click({...base, actionUrl: url})).toHaveBeenCalledWith(url);
 });
});
