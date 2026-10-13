import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ check: vi.fn(), apply: vi.fn(), reload: vi.fn(), clear: vi.fn(), current: null as any }))
vi.mock('react-router', async () => await vi.importActual('react-router'))
vi.mock('firebase/auth', () => ({ checkActionCode: mocks.check, applyActionCode: mocks.apply, reload: mocks.reload }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return mocks.current }, authStateReady: async () => {} } }))
vi.mock('@/lib/axios', () => ({ clearAuthCache: mocks.clear }))
import AuthActionPage from './index'

function Destination() {
  const location = useLocation()
  return <p data-testid="destination">{location.pathname}{location.search}</p>
}

function openAction(query: string) {
  render(<MemoryRouter initialEntries={[`/auth/action?${query}`]}>
    <Routes><Route path="/auth/action" element={<AuthActionPage />} /><Route path="*" element={<Destination />} /></Routes>
  </MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.current = null
  mocks.check.mockResolvedValue({ operation: 'VERIFY_EMAIL', data: { email: 'member@example.test' } })
  mocks.apply.mockResolvedValue(undefined)
  mocks.reload.mockResolvedValue(undefined)
})

it('opens the existing reset form with the original one-time code', async () => {
  openAction('mode=resetPassword&oobCode=private-code&apiKey=project-key')
  expect((await screen.findByTestId('destination')).textContent).toBe('/auth/reset-password?mode=resetPassword&oobCode=private-code&apiKey=project-key')
  expect(mocks.apply).not.toHaveBeenCalled()
})

it('checks verification and waits for confirmation before consuming the code', async () => {
  const path = '/agency-care/invitations/payload.signature'
  openAction(`mode=verifyEmail&oobCode=private-code&continueUrl=${encodeURIComponent(`https://app.joincareonboard.com${path}`)}`)
  fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }))
  await screen.findByRole('heading', { name: 'Email verified' })
  expect(mocks.apply).toHaveBeenCalledWith(expect.anything(), 'private-code')
  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', path)
})

it('does not apply a code when the link is only opened or inspected', async () => {
  openAction('mode=verifyEmail&oobCode=private-code')
  await screen.findByRole('button', { name: 'Verify email' })
  expect(mocks.check).toHaveBeenCalledWith(expect.anything(), 'private-code')
  expect(mocks.apply).not.toHaveBeenCalled()
})

it.each(['https://evil.example/phish', '//evil.example/phish', 'https://app.joincareonboard.com@evil.example/phish', 'https://app.joincareonboard.com/\\evil.example', 'javascript:alert(1)'])('rejects unsafe continuation %s', async continueUrl => {
  openAction(`mode=verifyEmail&oobCode=private-code&continueUrl=${encodeURIComponent(continueUrl)}`)
  fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }))
  await screen.findByRole('heading', { name: 'Email verified' })
  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/auth/login')
})

it('refreshes only the matching signed-in identity after verification', async () => {
  mocks.current = { uid: 'member', email: 'member@example.test', getIdToken: vi.fn().mockResolvedValue('fresh') }
  openAction('mode=verifyEmail&oobCode=private-code')
  fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }))
  await screen.findByRole('heading', { name: 'Email verified' })
  expect(mocks.reload).toHaveBeenCalledWith(mocks.current)
  expect(mocks.current.getIdToken).toHaveBeenCalledWith(true)
  expect(mocks.clear).toHaveBeenCalledOnce()
})

it('explains expired links without applying them', async () => {
  mocks.check.mockRejectedValue({ code: 'auth/expired-action-code' })
  openAction('mode=verifyEmail&oobCode=expired-code')
  expect(await screen.findByRole('alert')).toHaveTextContent(/expired/i)
  expect(mocks.apply).not.toHaveBeenCalled()
})

it.each(['mode=unsupported&oobCode=private-code', 'mode=verifyEmail'])('rejects malformed links %s', async query => {
  openAction(query)
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  expect(mocks.check).not.toHaveBeenCalled()
  expect(mocks.apply).not.toHaveBeenCalled()
})

it('rejects a code whose Firebase action does not match the requested mode', async () => {
  mocks.check.mockResolvedValue({ operation: 'PASSWORD_RESET', data: { email: 'member@example.test' } })
  openAction('mode=verifyEmail&oobCode=reset-code')
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  expect(mocks.apply).not.toHaveBeenCalled()
})

it('supports confirming email recovery', async () => {
  mocks.check.mockResolvedValue({ operation: 'RECOVER_EMAIL', data: { email: 'member@example.test' } })
  openAction('mode=recoverEmail&oobCode=recovery-code')
  fireEvent.click(await screen.findByRole('button', { name: 'Restore email' }))
  await screen.findByRole('heading', { name: 'Email restored' })
  expect(mocks.apply).toHaveBeenCalledWith(expect.anything(), 'recovery-code')
})

it('offers a retry if applying a valid link fails', async () => {
  mocks.apply.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
  openAction('mode=verifyEmail&oobCode=private-code')
  fireEvent.click(await screen.findByRole('button', { name: 'Verify email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i)
  fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
  await waitFor(() => expect(mocks.apply).toHaveBeenCalledTimes(2))
  await screen.findByRole('heading', { name: 'Email verified' })
})

it('retries checking the same link after a connection failure', async () => {
  mocks.check.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
  openAction('mode=verifyEmail&oobCode=private-code')
  expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByRole('button', { name: 'Verify email' })
  expect(mocks.check).toHaveBeenCalledTimes(2)
})

it('refreshes the recovered identity that still has its changed email address', async () => {
  mocks.check.mockResolvedValue({ operation: 'RECOVER_EMAIL', data: { email: 'original@example.test', previousEmail: 'changed@example.test' } })
  mocks.current = { uid: 'member', email: 'changed@example.test', getIdToken: vi.fn().mockResolvedValue('fresh') }
  openAction('mode=recoverEmail&oobCode=recovery-code')
  fireEvent.click(await screen.findByRole('button', { name: 'Restore email' }))
  await screen.findByRole('heading', { name: 'Email restored' })
  expect(mocks.reload).toHaveBeenCalledWith(mocks.current)
  expect(mocks.current.getIdToken).toHaveBeenCalledWith(true)
})
