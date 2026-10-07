import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
const mocks = vi.hoisted(() => ({ current: null as any, create: vi.fn(), verify: vi.fn(), reload: vi.fn(), post: vi.fn(), refresh: vi.fn(), navigate: vi.fn(), enrolled: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return mocks.current } } }))
vi.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: mocks.create, sendEmailVerification: mocks.verify, reload: mocks.reload, updateProfile: vi.fn() }))
vi.mock('@/lib/axios', () => ({ default: { post: mocks.post }, clearAuthCache: vi.fn() }))
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ refreshProfile: mocks.refresh }) }))
vi.mock('@/utils/auth/services/mfaService', () => ({ hasEnrolledMfa: mocks.enrolled }))
vi.mock('react-router', async (importOriginal) => ({ ...await importOriginal<typeof import('react-router')>(), useNavigate: () => mocks.navigate }))
import { AgencyCareRegistrationForm } from './AgencyCareRegistrationForm'

describe('invitation-bound registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.current = null
    mocks.enrolled.mockResolvedValue(false)
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
    expect(mocks.post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Verify your email'))
    expect(mocks.post).not.toHaveBeenCalled()
    mocks.current.emailVerified = true
    fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/agencyCare/invitations/invite-token/register', expect.objectContaining({ organization: { name: 'Partner Services', contactName: 'Partner Person' }, termsVersion: '2026-10-07', privacyVersion: '2026-10-07', operationId: expect.any(String) })))
    expect(mocks.navigate).toHaveBeenCalledWith('/auth/mfa-enroll?returnTo=%2Fagency-care%2Finvitations%2Finvite-token', { replace: true })
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
  })
})
