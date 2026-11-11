import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
vi.mock('@/pages/userPanel/dashboard/api', () => ({useUploadDocumentMutation: () => [vi.fn(), {isLoading: false}], useSaveDocumentMutation: () => [vi.fn(), {isLoading: false}]}));
import UserPanelDocumentUpload from './uploadDocumentModal';

const types = [{label: 'Drug Test', value: 'drug-test', requiresExpiry: false}, {label: 'Photo ID', value: 'photo-id', requiresExpiry: true}];

describe('document upload modal', () => {
 it('shows what the agency requested for the chosen type', () => {
  render(<UserPanelDocumentUpload isOpen setIsOpen={vi.fn()} onComplete={vi.fn()} onError={vi.fn()} documentTypes={types}
   initialDocumentType="drug-test" requestedDocuments={{'drug-test': {validThroughLabel: 'Jan 31, 2027', message: 'Before Friday'}}}/>);
  expect(screen.getByRole('dialog', {name: 'Upload document'})).toBeInTheDocument();
  expect(screen.getByText('Your agency asked you to upload this document.')).toBeInTheDocument();
  expect(screen.getByText('Valid through Jan 31, 2027')).toBeInTheDocument();
  expect(screen.getByText('Note: Before Friday')).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Upload document'})).toBeDisabled();
 });
 it('asks for an expiry date when the type needs one and closes on Cancel', () => {
  const setIsOpen = vi.fn();
  render(<UserPanelDocumentUpload isOpen setIsOpen={setIsOpen} onComplete={vi.fn()} onError={vi.fn()} documentTypes={types} initialDocumentType="photo-id"/>);
  expect(screen.queryByText('Your agency asked you to upload this document.')).not.toBeInTheDocument();
  expect(screen.getByText(/Add the expiry date printed on this document/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
  expect(setIsOpen).toHaveBeenCalledWith(false);
 });
});
