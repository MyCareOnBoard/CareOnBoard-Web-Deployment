import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  detect: vi.fn(), complete: vi.fn(), read: vi.fn(), navigate: vi.fn(), dispatch: vi.fn(),
  toast: vi.fn(), post: vi.fn(), signOut: vi.fn(),
  auth: { currentUser: { uid: 'family-member' } as { uid: string } | null, tenantId: null as string | null },
}))
vi.mock('react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/lib/firebase', () => ({ auth: mocks.auth }))
vi.mock('firebase/auth', () => ({ signOut: mocks.signOut }))
vi.mock('@/lib/axios', () => ({ default: { post: mocks.post } }))
vi.mock('@/utils/auth/store/authSlice', () => ({ setUser: (user: unknown) => ({ type: 'setUser', payload: user }) }))
vi.mock('@/utils/auth/services/emailLinkService', () => ({
  isFamilyEmailLink: mocks.detect, completeEmailLinkSignIn: mocks.complete, readPendingEmail: mocks.read,
  sendFamilySignInLink: vi.fn(), signInWithPassword: vi.fn(),
}))
vi.mock('@/utils/auth/services/mfaService', () => ({ createRecaptchaVerifier: vi.fn(), clearRecaptchaVerifier: vi.fn() }))
vi.mock('@/utils/auth/services/phoneAuthService', () => ({ startPhoneSignIn: vi.fn(), completePhoneSignIn: vi.fn() }))
vi.mock('@/pages/auth/components/RecaptchaAnchor', () => ({ RecaptchaAnchor: () => null }))
import FamilyLoginPage from './index'

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/auth/family-login')
  mocks.detect.mockResolvedValue(true)
  mocks.complete.mockResolvedValue({ user: { uid: 'family-member' } })
  mocks.read.mockReturnValue('stored@example.test')
  mocks.post.mockResolvedValue({ data: { data: { id: 'family-member' } } })
  mocks.auth.currentUser = { uid: 'family-member' }
  mocks.auth.tenantId = null
  mocks.signOut.mockImplementation(async () => { mocks.auth.currentUser = null })
  vi.spyOn(window, 'prompt').mockReturnValue('confirmed@example.test')
})

it('always asks for explicit email confirmation even when an email is remembered', async () => {
  render(<FamilyLoginPage />)
  await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith('confirmed@example.test'))
  expect(window.prompt).toHaveBeenCalledWith('Confirm the email address this link was sent to', 'stored@example.test')
})

it('does not redeem a link when the confirmation prompt is canceled', async () => {
  vi.mocked(window.prompt).mockReturnValue(null)
  render(<FamilyLoginPage />)
  expect(await screen.findByText(/We could not confirm which address/)).toBeInTheDocument()
  expect(mocks.complete).not.toHaveBeenCalled()
  expect(mocks.post).not.toHaveBeenCalled()
})

it('never takes the sign-in identity from URL parameters', async () => {
  mocks.read.mockReturnValue(null)
  window.history.replaceState({}, '', '/auth/family-login?email=attacker%40example.test')
  render(<FamilyLoginPage />)
  await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith('confirmed@example.test'))
  expect(window.prompt).toHaveBeenCalledWith('Confirm the email address this link was sent to', '')
})

it('catches link detection failures and shows a recoverable error', async () => {
  mocks.detect.mockRejectedValue(new Error('SDK detection failed'))
  render(<FamilyLoginPage />)
  expect(await screen.findByText(/sign-in link has expired or has already been used/)).toBeInTheDocument()
  expect(window.prompt).not.toHaveBeenCalled()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it('keeps one pending redemption when the effect runs again', async () => {
  let resolve!: (value: unknown) => void
  mocks.complete.mockReturnValue(new Promise(done => { resolve = done }))
  const view = render(<FamilyLoginPage />)
  await waitFor(() => expect(mocks.complete).toHaveBeenCalledOnce())
  mocks.toast = vi.fn()
  view.rerender(<FamilyLoginPage />)
  await act(async () => {})
  expect(mocks.complete).toHaveBeenCalledOnce()
  expect(window.prompt).toHaveBeenCalledOnce()
  await act(async () => { resolve({ user: { uid: 'family-member' } }) })
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce())
})

it('does not prompt or redeem an ordinary family login navigation', async () => {
  mocks.detect.mockResolvedValue(false)
  render(<FamilyLoginPage />)
  await act(async () => {})
  expect(window.prompt).not.toHaveBeenCalled()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it('completes once under StrictMode effect replay', async () => {
  render(<React.StrictMode><FamilyLoginPage /></React.StrictMode>)
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce())
  expect(window.prompt).toHaveBeenCalledOnce()
  expect(mocks.complete).toHaveBeenCalledOnce()
})

it('does not navigate after the family page unmounts during sign-in', async () => {
  let resolve!: (value: unknown) => void
  mocks.complete.mockReturnValue(new Promise(done => { resolve = done }))
  const view = render(<FamilyLoginPage />)
  await waitFor(() => expect(mocks.complete).toHaveBeenCalledOnce())
  view.unmount()
  await act(async () => { resolve({ user: { uid: 'family-member' } }) })
  expect(mocks.post).not.toHaveBeenCalled()
  expect(mocks.navigate).not.toHaveBeenCalled()
})

it.each(['unmounted', 'changed identity', 'changed tenant'])('ignores backend success after the page is %s', async change => {
  let resolve!: (value: unknown) => void
  mocks.post.mockReturnValue(new Promise(done => { resolve = done }))
  const view = render(<FamilyLoginPage />)
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce())
  if (change === 'unmounted') view.unmount()
  else if (change === 'changed identity') mocks.auth.currentUser = { uid: 'new-family-member' }
  else mocks.auth.tenantId = 'new-tenant'
  await act(async () => { resolve({ data: { data: { id: 'family-member' } } }) })
  expect(mocks.dispatch).not.toHaveBeenCalled()
  expect(mocks.navigate).not.toHaveBeenCalled()
  expect(mocks.signOut).not.toHaveBeenCalled()
})

it.each(['unmounted', 'changed identity', 'changed tenant'])('ignores backend failure after the page is %s', async change => {
  let reject!: (value: unknown) => void
  mocks.post.mockReturnValue(new Promise((_, fail) => { reject = fail }))
  const view = render(<FamilyLoginPage />)
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce())
  if (change === 'unmounted') view.unmount()
  else if (change === 'changed identity') mocks.auth.currentUser = { uid: 'new-family-member' }
  else mocks.auth.tenantId = 'new-tenant'
  await act(async () => { reject({ response: { status: 403 } }) })
  expect(mocks.toast).not.toHaveBeenCalled()
  expect(mocks.signOut).not.toHaveBeenCalled()
  expect(mocks.navigate).not.toHaveBeenCalled()
})
