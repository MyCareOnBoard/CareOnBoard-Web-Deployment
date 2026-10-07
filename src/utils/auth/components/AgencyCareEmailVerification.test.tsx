import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ current: null as any, send: vi.fn(), reload: vi.fn(), refresh: vi.fn(), clear: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return mocks.current } } }))
vi.mock('firebase/auth', () => ({ sendEmailVerification: mocks.send, reload: mocks.reload }))
vi.mock('@/utils/auth/context/AuthContext', () => ({ useAuth: () => ({ refreshProfile: mocks.refresh }) }))
vi.mock('@/lib/axios', () => ({ clearAuthCache: mocks.clear }))
import { AgencyCareEmailVerification } from './AgencyCareEmailVerification'
beforeEach(() => { vi.clearAllMocks(); mocks.current = { uid: 'existing-sc', email: 'sc@example.test', emailVerified: false, getIdToken: vi.fn().mockResolvedValue('verified-token') }; mocks.send.mockResolvedValue(undefined); mocks.reload.mockResolvedValue(undefined); mocks.refresh.mockResolvedValue(undefined) })

it('waits for an explicit email request and keeps unverified accounts behind the care boundary', async () => {
  const verified = vi.fn()
  render(<AgencyCareEmailVerification onVerified={verified} />)
  expect(mocks.send).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }))
  await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(mocks.current))
  fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Verify your email'))
  expect(verified).not.toHaveBeenCalled()
  expect(mocks.refresh).not.toHaveBeenCalled()
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
