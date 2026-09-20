
import {useState} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import {Stage3HealthcareAndDocuments} from './Stage3HealthcareAndDocuments';
import {createInitialAddClientFormData} from '../types/formData';

vi.mock('../components/AddressAutocompleteInput', () => ({AddressAutocompleteInput: () => null}));

it.each(['ddd', 'hha'] as const)('toggles AENF upload visibility without removing saved %s evidence', type => {
  function Harness() {
    const [formData, setFormData] = useState(() => {
      const initial = createInitialAddClientFormData();
      initial.type = type;
      initial.acuityRequirements = {enabled: true, types: ['medication']};
      const document = initial.stage3.docs.find(doc => doc.key === 'aenf')!;
      document.url = 'https://example.test/aenf.pdf';
      document.fileName = 'aenf.pdf';
      return initial;
    });
    return <>
      <Stage3HealthcareAndDocuments footer={null} formData={formData} setFormData={setFormData} />
      <output data-testid="acuity">{JSON.stringify(formData.acuityRequirements)}</output>
      <output data-testid="evidence">{formData.stage3.docs.find(doc => doc.key === 'aenf')?.url}</output>
    </>;
  }
  const view = render(<Harness />);
  const toggle = screen.getByRole('switch', {name: 'Does this client have an Acuity requirement?'});
  const upload = view.container.querySelector('#doc-upload-aenf')!.parentElement!;
  expect(toggle).toBeChecked();
  const medication = screen.getByRole('checkbox', {name: 'Medication'});
  const behavioral = screen.getByRole('checkbox', {name: 'Behavioral'});
  const both = screen.getByRole('checkbox', {name: 'Both'});
  expect(medication).toBeChecked();
  expect(both).not.toBeChecked();
  fireEvent.click(both);
  expect(medication).toBeChecked(); expect(behavioral).toBeChecked(); expect(both).toBeChecked();
  fireEvent.click(medication);
  expect(both).not.toBeChecked(); expect(behavioral).toBeChecked();
  fireEvent.click(medication);
  expect(both).toBeChecked();
  fireEvent.click(both);
  expect(medication).not.toBeChecked(); expect(behavioral).not.toBeChecked();
  expect(view.container.querySelector('#doc-upload-aenf')!.parentElement!).not.toBeVisible();
  expect(screen.getByText(/Select Medication, Behavioral, or Both, and upload/)).toBeVisible();
  fireEvent.click(behavioral);
  expect(upload).toBeVisible();
  fireEvent.click(toggle);
  expect(upload).not.toBeVisible();
  expect(screen.queryByRole('checkbox', {name: 'Both'})).toBeNull();
  expect(screen.getByTestId('acuity')).toHaveTextContent('{"enabled":false,"types":["behavioral"]}');
  expect(screen.getByTestId('evidence')).toHaveTextContent('https://example.test/aenf.pdf');
  fireEvent.click(toggle);
  expect(upload).toBeVisible();
});
