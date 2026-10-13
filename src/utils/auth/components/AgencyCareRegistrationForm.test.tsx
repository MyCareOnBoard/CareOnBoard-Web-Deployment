import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
const mocks = vi.hoisted(() => ({ current: null as any, create: vi.fn(), verify: vi.fn(), reload: vi.fn(), post: vi.fn(), refresh: vi.fn(), navigate: vi.fn(), enrolled: vi.fn(), toast: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return mocks.current } } }))
vi.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: mocks.create, sendEmailVerification: vi.fn(), reload: mocks.reload, updateProfile: vi.fn() }))
vi.mock('@/utils/auth/services/authEmailService', () => ({ sendCustomVerificationEmail: mocks.verify }))
vi.mock('@/lib/axios', () => ({ default: { post: mocks.post }, clearAuthCache: vi.fn() }))
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ refreshProfile: mocks.refresh }) }))
vi.mock('@/utils/auth/services/mfaService', () => ({ hasEnrolledMfa: mocks.enrolled }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('react-router', async (importOriginal) => ({ ...await importOriginal<typeof import('react-router')>(), useNavigate: () => mocks.navigate }))
import { AgencyCareRegistrationForm } from './AgencyCareRegistrationForm'

describe('invitation-bound registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.current = null
    mocks.enrolled.mockResolvedValue(false)
    mocks.verify.mockResolvedValue(undefined)
    mocks.post.mockResolvedValue({ data: { registered: true } })
    mocks.create.mockImplementation(async (_auth, email) => {
      mocks.current = { uid: 'new-partner', email, emailVerified: false }
      return { user: mocks.current }
    })
  })
  it('waits for verified email before creating a limited profile and continuing native MFA', async () => {
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" needsOrganization onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Partner Person' } })
    fireEvent.change(screen.getByLabelText('Agency name'), { target: { value: 'Partner Services' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'partner@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce())
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('partner@example.test')
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Account created', variant: 'success', description: expect.stringContaining('partner@example.test') }))
    expect(mocks.verify).toHaveBeenCalledWith(mocks.current, '/agency-care/invitations/invite-token')
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Verify your email'))
    expect(mocks.post).not.toHaveBeenCalled()
    mocks.current.emailVerified = true
    fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/agencyCare/invitations/invite-token/register', expect.objectContaining({ organization: { name: 'Partner Services', contactName: 'Partner Person' }, termsVersion: '2026-10-07', privacyVersion: '2026-10-07', operationId: expect.any(String) })))
    expect(mocks.navigate).toHaveBeenCalledWith('/auth/mfa-enroll?returnTo=%2Fagency-care%2Finvitations%2Finvite-token', { replace: true })
  })
  it('prefills and locks the invitation identity while leaving the password editable', async () => {
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" needsOrganization invitationDetails={{ fullName: 'Invited Person', agencyName: 'Invited Agency', email: 'invited@example.test' }} onRegistered={vi.fn()} /></MemoryRouter>)
    for (const [label, value] of [['Full name', 'Invited Person'], ['Agency name', 'Invited Agency'], ['Email', 'invited@example.test']]) {
      expect(screen.getByLabelText(label)).toHaveValue(value)
      expect(screen.getByLabelText(label)).toHaveAttribute('readonly')
      fireEvent.change(screen.getByLabelText(label), { target: { value: 'Changed value' } })
    }
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('readonly')
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce())
    expect(mocks.create).toHaveBeenCalledWith(expect.anything(), 'invited@example.test', 'password123')
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Agency name')).not.toBeInTheDocument()
    mocks.current.emailVerified = true
    fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/agencyCare/invitations/invite-token/register', expect.objectContaining({ organization: { name: 'Invited Agency', contactName: 'Invited Person' } })))
  })
  it('resends through the custom sender with the same invitation continuation', async () => {
    mocks.current = { uid: 'existing-provider', displayName: 'Provider Person', email: 'provider@example.test', emailVerified: false }
    render(<MemoryRouter><AgencyCareRegistrationForm token="signed.token" onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith(mocks.current, '/agency-care/invitations/signed.token'))
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeVisible()
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Verification email sent', variant: 'success' }))
  })

  it('announces account creation and email delivery only after the email sender succeeds', async () => {
    let finish!: () => void
    mocks.verify.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" invitationDetails={{ fullName: 'Invited Person', agencyName: 'Invited Agency', email: 'invited@example.test' }} onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce())
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await act(async () => { finish() })
    expect(screen.getByRole('status')).toHaveTextContent('invited@example.test')
    expect(mocks.toast).toHaveBeenCalledOnce()
  })

  it('keeps verification recovery available without claiming failed email delivery succeeded', async () => {
    mocks.verify.mockRejectedValueOnce(new Error('Email delivery is temporarily unavailable.'))
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" invitationDetails={{ fullName: 'Invited Person', agencyName: 'Invited Agency', email: 'invited@example.test' }} onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it('discards resend success after the signed-in account changes', async () => {
    let finish!: () => void
    mocks.current = { uid: 'existing-provider', displayName: 'Provider Person', email: 'provider@example.test', emailVerified: false }
    mocks.verify.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce())
    mocks.current = { uid: 'other-account', email: 'other@example.test', emailVerified: false }
    await act(async () => { finish() })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it('clears confirmed delivery status when a different account uses the same invitation form', async () => {
    mocks.current = { uid: 'existing-provider', displayName: 'Provider Person', email: 'provider@example.test', emailVerified: false }
    const form = <MemoryRouter><AgencyCareRegistrationForm token="invite-token" onRegistered={vi.fn()} /></MemoryRouter>
    const { rerender } = render(form)
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    expect(await screen.findByRole('status')).toHaveTextContent('provider@example.test')
    mocks.current = { uid: 'other-account', email: 'other@example.test', emailVerified: false }
    rerender(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" onRegistered={vi.fn()} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
    expect(screen.getByText('other@example.test', { selector: 'strong' })).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocks.toast).toHaveBeenCalledOnce()
  })

  it('shows the actionable custom sender error on resend', async () => {
    mocks.current = { uid: 'existing-provider', displayName: 'Provider Person', email: 'provider@example.test', emailVerified: false }
    mocks.verify.mockRejectedValueOnce(new Error('Too many email requests. Please wait a few minutes before trying again.'))
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Too many email requests'))
    expect(mocks.toast).not.toHaveBeenCalled()
  })
  it('resumes a verified signed-in identity without creating a different account', async () => {
    mocks.current = { uid: 'existing-provider', displayName: 'Provider Person', email: 'provider@example.test', emailVerified: true }
    mocks.enrolled.mockResolvedValue(true)
    const onRegistered = vi.fn()
    render(<MemoryRouter><AgencyCareRegistrationForm token="member-token" onRegistered={onRegistered} /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with this account' }))
    await waitFor(() => expect(onRegistered).toHaveBeenCalledOnce())
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.post.mock.calls[0][1]).not.toHaveProperty('organization')
  })

  it('offers sign-in recovery for an existing email without applicant creation', async () => {
    mocks.create.mockRejectedValue(Object.assign(new Error('Duplicate account'), { code: 'auth/email-already-in-use' }))
    render(<MemoryRouter><AgencyCareRegistrationForm token="invite-token" onRegistered={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Partner Person' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'partner@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sign in to continue'))
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login?returnTo=%2Fagency-care%2Finvitations%2Finvite-token')
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.toast).not.toHaveBeenCalled()
  })
})
