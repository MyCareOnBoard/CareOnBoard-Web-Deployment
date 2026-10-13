import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ current: null as any, send: vi.fn(), reload: vi.fn(), refresh: vi.fn(), clear: vi.fn(), toast: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return mocks.current } } }))
vi.mock('firebase/auth', () => ({ sendEmailVerification: vi.fn(), reload: mocks.reload }))
vi.mock('@/utils/auth/services/authEmailService', () => ({ sendCustomVerificationEmail: mocks.send }))
vi.mock('@/utils/auth/context/AuthContext', () => ({ useAuth: () => ({ refreshProfile: mocks.refresh }) }))
vi.mock('@/lib/axios', () => ({ clearAuthCache: mocks.clear }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
import { AgencyCareEmailVerification } from './AgencyCareEmailVerification'
beforeEach(() => { vi.clearAllMocks(); mocks.current = { uid: 'existing-sc', email: 'sc@example.test', emailVerified: false, getIdToken: vi.fn().mockResolvedValue('verified-token') }; mocks.send.mockResolvedValue(undefined); mocks.reload.mockResolvedValue(undefined); mocks.refresh.mockResolvedValue(undefined) })

it('waits for an explicit email request and keeps unverified accounts behind the care boundary', async () => {
  const verified = vi.fn()
  render(<AgencyCareEmailVerification onVerified={verified} />)
  expect(mocks.send).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }))
  await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(mocks.current, undefined))
  expect(screen.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('sc@example.test')
  expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Verification email sent', variant: 'success' }))
  fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Verify your email'))
  expect(verified).not.toHaveBeenCalled()
  expect(mocks.refresh).not.toHaveBeenCalled()
})

it('keeps the active invitation path and query in custom verification emails', async () => {
  window.history.replaceState({}, '', '/agency-care/invitations/signed.token?agencyKey=partner')
  try {
    render(<AgencyCareEmailVerification onVerified={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(mocks.current, '/agency-care/invitations/signed.token?agencyKey=partner'))
  } finally {
    window.history.replaceState({}, '', '/')
  }
})

it('shows actionable custom email failures without claiming delivery succeeded', async () => {
  mocks.send.mockRejectedValueOnce(new Error('Email delivery is temporarily unavailable. Please try again in a few minutes.'))
  render(<AgencyCareEmailVerification onVerified={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable'))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(mocks.toast).not.toHaveBeenCalled()
})

it('discards former account email-delivery feedback after UID changes', async () => {
  let finish!: () => void
  mocks.send.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  render(<AgencyCareEmailVerification onVerified={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }))
  await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce())
  mocks.current = { uid: 'other-account', email: 'other@example.test', emailVerified: false }
  await act(async () => { finish() })
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(mocks.toast).not.toHaveBeenCalled()
})

it('clears confirmed delivery status when the current account changes without a remount', async () => {
  const verified = vi.fn()
  const { rerender } = render(<AgencyCareEmailVerification onVerified={verified} />)
  fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }))
  expect(await screen.findByRole('status')).toHaveTextContent('sc@example.test')
  mocks.current = { uid: 'other-account', email: 'other@example.test', emailVerified: false }
  rerender(<AgencyCareEmailVerification onVerified={verified} />)
  expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send verification email' })).toBeEnabled()
  expect(mocks.toast).toHaveBeenCalledOnce()
})

it('refreshes verified identity and own profile before continuing the same care page', async () => {
  const verified = vi.fn()
  render(<AgencyCareEmailVerification onVerified={verified} />)
  mocks.reload.mockImplementationOnce(async () => { mocks.current.emailVerified = true })
  fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
  await waitFor(() => expect(verified).toHaveBeenCalledOnce())
  expect(mocks.current.getIdToken).toHaveBeenCalledWith(true)
  expect(mocks.clear).toHaveBeenCalledOnce()
  expect(mocks.refresh).toHaveBeenCalledOnce()
  expect(mocks.refresh.mock.invocationCallOrder[0]).toBeLessThan(verified.mock.invocationCallOrder[0])
})

it('discards a former account verification result after UID changes', async () => {
  let finish!: () => void
  mocks.reload.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  const verified = vi.fn()
  render(<AgencyCareEmailVerification onVerified={verified} />)
  fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
  await waitFor(() => expect(mocks.reload).toHaveBeenCalledOnce())
  mocks.current = { uid: 'other-account', emailVerified: true }
  finish()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Check email verification' })).not.toBeDisabled())
  expect(verified).not.toHaveBeenCalled()
  expect(mocks.refresh).not.toHaveBeenCalled()
})
