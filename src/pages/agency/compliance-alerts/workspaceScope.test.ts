import {describe, expect, it} from 'vitest';
import {getComplianceSources, parseComplianceView, complianceHref} from './workspaceScope';
const staff = (accessList: string[], agencyModes: unknown = ['ddd', 'hha', 'sc']) => ({userType: 'agency_staff', profile: {accessList, agencyModes}, agency: {supportedClientTypes: ['ddd', 'hha', 'sc']}});
describe('workspace access and URL boundary', () => {
  it('intersects workspace with independent source grants', () => {
    expect(getComplianceSources(staff(['Compliance Alerts', 'Trainings']), 'ddd')).toEqual(['document_expiry', 'training']);
    expect(getComplianceSources(staff(['Compliance Alerts', 'Client Management']), 'hha')).toEqual(['client_documents', 'manual_audits', 'unsigned_form485']);
    expect(getComplianceSources(staff(['Compliance Alerts', 'Notes', 'Scheduling']), 'ddd')).toEqual(['shift_notes']);
    expect(getComplianceSources(staff(['Compliance Alerts', 'Notes', 'Shift Management']), 'ddd')).toEqual(['shift_notes']);
    expect(getComplianceSources(staff(['Compliance Alerts']), 'ddd')).toEqual([]);
    expect(getComplianceSources(staff(['Trainings']), 'ddd')).toEqual([]);
    expect(getComplianceSources(staff(['Compliance Alerts', 'Client Management']), 'ddd')).toContain('manual_audits');
    expect(getComplianceSources(staff(['Compliance Alerts', 'Client Management']), 'hha')).toContain('manual_audits');
    expect(getComplianceSources(staff(['Compliance Alerts', 'Client Management']), 'sc')).not.toContain('manual_audits');
  });
  it('parses manual audit detail and list links without mixing cursor shapes', () => {
    expect(parseComplianceView(new URLSearchParams('section=clients&source=manual_audits&mode=ddd&clientId=c&auditId=a'))).toMatchObject({ok: true, view: {source: 'manual_audits', clientId: 'c', auditId: 'a'}});
    expect(parseComplianceView(new URLSearchParams('source=manual_audits&mode=hha&auditView=drafts&cursor=next'))).toMatchObject({ok: true, view: {auditView: 'drafts', cursor: 'next'}});
    expect(parseComplianceView(new URLSearchParams('source=manual_audits&mode=hha&clientId=c&auditView=drafts&cursor=next')).ok).toBe(true);
    for (const query of ['source=manual_audits&auditId=a', 'source=manual_audits&clientId=c&auditId=a&cursor=next', 'source=manual_audits&auditView=bad', 'source=manual_audits&auditView=drafts&status=active']) {
      expect(parseComplianceView(new URLSearchParams(query)).ok).toBe(false);
    }
  });
  it('retains owner and SC staff capabilities without broadening explicit grants', () => {
    expect(getComplianceSources({userType: 'agency', agency: {supportedClientTypes: ['ddd']}}, 'ddd')).toEqual(['document_expiry', 'training', 'client_documents', 'manual_audits', 'shift_notes']);
    expect(getComplianceSources(staff(['Compliance Alerts', 'DSP Management', 'Trainings', 'Client Management']), 'sc')).toEqual(['document_expiry', 'training']);
    for (const grant of [[], 'ddd', ['bad'], ['ddd', 'ddd']]) expect(getComplianceSources(staff(['Compliance Alerts', 'Trainings'], grant), 'ddd')).toEqual([]);
  });
  it('parses legacy notification and allowed selections', () => {
    expect(parseComplianceView(new URLSearchParams('shiftId=shift-1'))).toEqual({ok: true, view: {section: 'shifts', source: 'shift_notes', shiftId: 'shift-1'}});
    expect(parseComplianceView(new URLSearchParams('section=staff&source=training&employeeId=employee'))).toMatchObject({ok: true, view: {source: 'training', employeeId: 'employee'}});
  });
  it.each(['source=bad','section=clients&source=training','source=training&startDate=2026-09-01','source=training&mode=sc','source=training&employeeId=a%2Fb','source=shift_notes&startDate=2026-02-30','source=shift_notes&startDate=2026-09-18&endDate=2026-09-17','source=unsigned_form485&mode=ddd','source=client_documents&clientId=c&search=a','source=training&source=training'])('rejects invalid URL %s', query => {
    expect(parseComplianceView(new URLSearchParams(query)).ok).toBe(false);
  });
  it('navigation links omit source cursors and cannot contain evidence URLs', () => {
    expect(complianceHref({source: 'training', section: 'staff', mode: 'ddd', employeeId: 'staff', cursor: 'secret', staffCursor: 'other'})).toBe('/agency/compliance-alerts?section=staff&source=training&mode=ddd&employeeId=staff');
  });
});
