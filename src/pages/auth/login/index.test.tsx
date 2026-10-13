import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './index'

const mocks = vi.hoisted(() => ({ login: vi.fn(), toast: vi.fn(), completePostLogin: vi.fn() }))
vi.mock('react-router', async () => await vi.importActual('react-router'))
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ login: mocks.login }) }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }))
vi.mock('@/utils/auth/helpers/postLogin', () => ({ completePostLogin: mocks.completePostLogin }))

function Destination() {
  const location = useLocation()
  return <p data-testid="destination">{location.pathname}{location.search}</p>
}

function renderLogin(returnTo?: string) {
  render(<MemoryRouter initialEntries={[`/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`]}>
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="*" element={<Destination />} />
    </Routes>
  </MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'external@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Login' }))
}

describe('pending Agency Care identity login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.login.mockResolvedValue({ status: 'profile_required', uid: 'external-1' })
  })

  it('resumes the validated invitation before product profile loading or MFA', async () => {
    const invitation = '/agency-care/invitations/payload.signature?agencyKey=internal%3Aagency-1'
    renderLogin(invitation)

    expect((await screen.findByTestId('destination')).textContent).toBe(`${invitation}&intent=register`)
    expect(mocks.completePostLogin).not.toHaveBeenCalled()
    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it.each([undefined, '/agency-care/clients', '/agency-care/invitations/token/extra', 'https://untrusted.example/agency-care/invitations/token'])('explains incomplete setup without sending a pending identity to %s', async (returnTo) => {
    renderLogin(returnTo)

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      description: expect.stringMatching(/setup is incomplete.*invitation/i),
    })))
    expect(screen.getByRole('heading', { name: 'Login to account' })).toBeInTheDocument()
    expect(mocks.completePostLogin).not.toHaveBeenCalled()
  })

  it('preserves MFA challenge continuation for registered users', async () => {
    mocks.login.mockResolvedValue({ status: 'mfa_required' })
    const invitation = '/agency-care/invitations/payload.signature'
    renderLogin(invitation)

    const destination = new URL((await screen.findByTestId('destination')).textContent!, 'https://app.example')
    expect(destination.pathname).toBe('/auth/mfa-challenge')
    expect(destination.searchParams.get('returnTo')).toBe(invitation)
    expect(mocks.completePostLogin).not.toHaveBeenCalled()
  })

  it('completes normal product login after the profile is available', async () => {
    mocks.login.mockResolvedValue({ status: 'success', user: { uid: 'staff-1' } })
    renderLogin('/agency-care/clients')

    await waitFor(() => expect(mocks.completePostLogin).toHaveBeenCalledWith(
      expect.any(Function), expect.any(Function), mocks.toast, '/agency-care/clients',
    ))
  })
})
