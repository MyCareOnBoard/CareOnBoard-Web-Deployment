import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAgencyInfo } from '@/lib/api/onboarding'
import SignUpPage from './index'

vi.mock('react-router', async () => await vi.importActual('react-router'))
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ signup: vi.fn() }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/lib/api/onboarding', () => ({ getAgencyInfo: vi.fn() }))

function InvitationDestination() {
  const location = useLocation()
  return <p data-testid="invitation-destination">{location.pathname}{location.search}</p>
}

describe('Agency Care signup continuation', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['payload.signature_123-abc', 'legacy-token', 'payload.signature/'])('returns %s to invitation-bound registration without loading an applicant agency', async (token) => {
    const invitation = `/agency-care/invitations/${token}?agencyKey=internal%3Addd-agency`
    render(<MemoryRouter initialEntries={[`/auth/signup?agencyId=unrelated&returnTo=${encodeURIComponent(invitation)}`]}>
      <Routes>
        <Route path="/auth/signup" element={<SignUpPage />} />
        <Route path="/agency-care/invitations/:token" element={<InvitationDestination />} />
      </Routes>
    </MemoryRouter>)

    const destination = await screen.findByTestId('invitation-destination')
    const url = new URL(destination.textContent!, 'https://app.example')
    expect(url.pathname).toBe(`/agency-care/invitations/${token}`)
    expect(url.searchParams.get('agencyKey')).toBe('internal:ddd-agency')
    expect(url.searchParams.get('intent')).toBe('register')
    expect(getAgencyInfo).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Create an account' })).not.toBeInTheDocument()
  })
})
