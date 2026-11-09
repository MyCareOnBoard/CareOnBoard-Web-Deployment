import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAgencyInfo } from '@/lib/api/onboarding'
import SignUpPage from './index'

vi.mock('react-router', async () => await vi.importActual('react-router'))
const signup = vi.hoisted(() => vi.fn())
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ signup }) }))
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
    expect(screen.queryByRole('heading', { name: "Let's get you started." })).not.toBeInTheDocument()
  })
})

describe('signup form', () => {
  beforeEach(() => vi.clearAllMocks())

  const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/auth/signup" element={<SignUpPage />} /></Routes>
  </MemoryRouter>)

  it('explains that an invite link is needed and keeps sign up off', () => {
    renderAt('/auth/signup')
    expect(screen.getByRole('alert')).toHaveTextContent('You need an invitation')
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
    expect(getAgencyInfo).not.toHaveBeenCalled()
  })

  it('marks password rules as they are met and requires all of them', async () => {
    vi.mocked(getAgencyInfo).mockResolvedValue({ agency: { name: 'Sunrise', supportedClientTypes: ['ddd'] } })
    renderAt('/auth/signup?agencyId=a1')
    const submit = await screen.findByRole('button', { name: 'Sign up' })
    await waitFor(() => expect(submit).toBeEnabled())

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ama Mensah' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc1234' } })
    const rules = within(screen.getByRole('list', { name: 'Password rules' }))
    expect(rules.getByText('Number').parentElement).toHaveTextContent('(met)')
    expect(rules.getByText('8+ Characters').parentElement).toHaveTextContent('(not met)')

    fireEvent.click(submit)
    expect(await screen.findByText('Password must be at least 8 characters long.')).toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abc12345' } })
    fireEvent.click(submit)
    await waitFor(() => expect(signup).toHaveBeenCalledWith('ama@example.com', 'Abc12345', 'Ama Mensah', 'a1', 'dsp'))
  })
})
