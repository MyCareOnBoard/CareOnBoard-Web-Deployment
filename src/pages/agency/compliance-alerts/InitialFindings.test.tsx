import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import InitialFindings from './InitialFindings';
const result = vi.hoisted(() => ({ currentData: undefined as any, isFetching: false, error: undefined, refetch: vi.fn() }));
vi.mock('./api', () => ({ useGetInitialFindingsQuery: () => result }));
afterEach(cleanup);
it('keeps sparse and resolved pages truthful and uses direct record links', () => {
    result.currentData = { items: [], nextCursor: 'next', coverage: 'partial' };
    const props = { runId: 'run', scopeKey: 'viewer', mode: 'ddd', onBack: vi.fn() };
    const view = render(<InitialFindings {...props}/>);
    expect(screen.getByText('More results available')).toBeInTheDocument();
    expect(screen.queryByText('No initial findings currently need your attention.')).not.toBeInTheDocument();
    result.currentData = { items: [{ id: 'i', title: 'Client ISP expired', program: 'ddd', initialReason: 'expired', currentState: 'resolved', actionUrl: '/agency/clients/client-1?tab=documents&documentKey=isp' }], nextCursor: null, coverage: 'ready' };
    view.rerender(<InitialFindings {...props}/>);
    expect(screen.getByText(/DDD · Resolved/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open record' })).toHaveAttribute('href', '/agency/clients/client-1?tab=documents&documentKey=isp');
});
