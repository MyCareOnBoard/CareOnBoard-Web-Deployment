import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ check: vi.fn(), verify: vi.fn(), confirm: vi.fn() }))
vi.mock('react-router', async () => await vi.importActual('react-router'))
vi.mock('firebase/auth', () => ({ checkActionCode: mocks.check, verifyPasswordResetCode: mocks.verify, confirmPasswordReset: mocks.confirm }))
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null, tenantId: null, app: { options: { projectId: 'care-on-board', apiKey: 'project-key' } } } }))
vi.mock('@/utils/auth/helpers/emailAction', async () => {
  const actual = await vi.importActual('@/utils/auth/helpers/emailAction')
  return { ...actual, getEmailActionAuth: (params: URLSearchParams) => ({ currentUser: null, tenantId: params.get('tenantId'), languageCode: params.get('lang') || 'en' }) }
})
import ResetPasswordPage from './index'

const validQuery = 'mode=resetPassword&oobCode=synthetic-code&apiKey=project-key'

function Navigation({ nextQuery }: { nextQuery: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  return <><p data-testid="location">{location.pathname}{location.search}</p><button onClick={() => navigate(`/auth/reset-password?${nextQuery}`)}>Change link</button></>
}

function openReset(query = validQuery, nextQuery = `${validQuery.replace('synthetic-code', 'next-code')}`) {
  render(<MemoryRouter initialEntries={[`/auth/reset-password?${query}`]}>
    <Navigation nextQuery={nextQuery} />
    <Routes><Route path="/auth/reset-password" element={<ResetPasswordPage />} /></Routes>
  </MemoryRouter>)
}

async function fillPassword(password = 'Secure123', confirmation = password) {
  fireEvent.change(await screen.findByLabelText('New Password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: confirmation } })
}

function submit() {
  fireEvent.submit(screen.getByLabelText('New Password').closest('form')!)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.check.mockResolvedValue({ operation: 'PASSWORD_RESET', data: { email: 'member@example.test' } })
  mocks.verify.mockResolvedValue('member@example.test')
  mocks.confirm.mockResolvedValue(undefined)
})

it('validates a direct signed-out link using the pinned tenant context and preserves its parameters', async () => {
  const query = `${validQuery}&tenantId=tenant-a&lang=es&continueUrl=${encodeURIComponent('https://app.joincareonboard.com/auth/login')}`
  openReset(query)
  await screen.findByLabelText('New Password')
  expect(mocks.check).toHaveBeenCalledWith(expect.objectContaining({ currentUser: null, tenantId: 'tenant-a', languageCode: 'es' }), 'synthetic-code')
  expect(mocks.verify).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-a' }), 'synthetic-code')
  expect(mocks.confirm).not.toHaveBeenCalled()
  expect(screen.getByTestId('location')).toHaveTextContent(`/auth/reset-password?${query}`)
})

it('confirms only a submitted password and offers an explicit safe continuation after success', async () => {
  const continuation = '/agency-care/invitations/payload.signature?agencyKey=external%3Aagency#verify'
  openReset(`${validQuery}&continueUrl=${encodeURIComponent('https://app.joincareonboard.com' + continuation)}`)
  await fillPassword()
  submit()
  await screen.findByRole('heading', { name: 'Password updated' })
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ tenantId: null }), 'synthetic-code', 'Secure123')
  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', continuation)
  expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
  expect(screen.getByTestId('location')).toHaveTextContent('/auth/reset-password?')
})

it.each([
  ['', /missing/i],
  ['mode=resetPassword', /missing/i],
  ['mode=unsupported&oobCode=synthetic-code', /not supported/i],
  ['mode=verifyEmail&oobCode=synthetic-code', /does not match/i],
  [`${validQuery}&mode=resetPassword`, /invalid/i],
  [validQuery.replace('project-key', 'other-project-key'), /different Firebase project/i],
  [`${validQuery}&tenantId=invalid.tenant`, /tenant/i],
  [`${validQuery}&lang=invalid.language`, /language/i],
])('rejects malformed or mismatched query %s before calling Firebase', async (query, message) => {
  openReset(query)
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(mocks.check).not.toHaveBeenCalled()
  expect(mocks.verify).not.toHaveBeenCalled()
  expect(mocks.confirm).not.toHaveBeenCalled()
})

it('rejects a Firebase operation that does not match password reset', async () => {
  mocks.check.mockResolvedValue({ operation: 'VERIFY_EMAIL', data: { email: 'member@example.test' } })
  openReset()
  expect(await screen.findByRole('alert')).toHaveTextContent(/does not match/i)
  expect(mocks.verify).not.toHaveBeenCalled()
  expect(mocks.confirm).not.toHaveBeenCalled()
})

it.each([
  ['auth/expired-action-code', /expired/i],
  ['auth/invalid-action-code', /invalid or has already been used/i],
])('shows a clear verification failure for %s', async (code, message) => {
  mocks.verify.mockRejectedValue({ code })
  openReset()
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
  expect(mocks.confirm).not.toHaveBeenCalled()
})

it('retries checking a link after a connection failure', async () => {
  mocks.check.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
  openReset()
  expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByLabelText('New Password')
  expect(mocks.check).toHaveBeenCalledTimes(2)
  expect(mocks.confirm).not.toHaveBeenCalled()
})

it.each([
  ['', '', /enter your password/i],
  ['Abc123', 'Abc123', /at least 8 characters/i],
  ['ABC12345', 'ABC12345', /lowercase/i],
  ['abc12345', 'abc12345', /uppercase/i],
  ['Password', 'Password', /number/i],
  ['Secure123', '', /confirm your password/i],
  ['Secure123', 'Different123', /don't match/i],
])('preserves password validation for %s', async (password, confirmation, message) => {
  openReset()
  await fillPassword(password, confirmation)
  submit()
  expect(screen.getAllByRole('alert').some(alert => message.test(alert.textContent || ''))).toBe(true)
  expect(mocks.confirm).not.toHaveBeenCalled()
})

it('prevents duplicate password submissions while confirmation is pending and after success', async () => {
  let finish!: () => void
  mocks.confirm.mockReturnValue(new Promise<void>(resolve => { finish = resolve }))
  openReset()
  await fillPassword()
  submit()
  submit()
  expect(mocks.confirm).toHaveBeenCalledOnce()
  await act(async () => { finish() })
  await screen.findByRole('heading', { name: 'Password updated' })
  expect(screen.queryByRole('button', { name: 'Reset Password' })).not.toBeInTheDocument()
  expect(mocks.confirm).toHaveBeenCalledOnce()
})

it.each([
  ['auth/expired-action-code', /expired/i],
  ['auth/invalid-action-code', /invalid or has already been used/i],
])('removes the form if the code becomes unusable at confirmation: %s', async (code, message) => {
  mocks.confirm.mockRejectedValue({ code })
  openReset()
  await fillPassword()
  submit()
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
})

it('keeps a valid form retryable after a confirmation connection failure', async () => {
  mocks.confirm.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
  openReset()
  await fillPassword()
  submit()
  expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i)
  submit()
  await screen.findByRole('heading', { name: 'Password updated' })
  expect(mocks.confirm).toHaveBeenCalledTimes(2)
})

it('preserves Firebase password requirements without marking a valid code unusable', async () => {
  mocks.confirm.mockRejectedValueOnce({ code: 'auth/weak-password', message: 'private provider details' })
  openReset()
  await fillPassword()
  submit()
  expect(await screen.findByText(/choose a stronger password/i)).toBeInTheDocument()
  expect(screen.getByLabelText('New Password')).toBeInTheDocument()
  expect(screen.queryByText('private provider details')).not.toBeInTheDocument()
})

it('uses accessible password visibility controls', async () => {
  openReset()
  const input = await screen.findByLabelText('New Password')
  fireEvent.click(screen.getByRole('button', { name: 'Show new password' }))
  expect(input).toHaveAttribute('type', 'text')
  fireEvent.click(screen.getByRole('button', { name: 'Hide new password' }))
  expect(input).toHaveAttribute('type', 'password')
  fireEvent.click(screen.getByRole('button', { name: 'Show password confirmation' }))
  expect(screen.getByLabelText('Confirm New Password')).toHaveAttribute('type', 'text')
})

it('ignores an old verification result after the route code changes', async () => {
  let finishOld!: (email: string) => void
  mocks.verify.mockImplementation((_auth, code) => code === 'synthetic-code'
    ? new Promise<string>(resolve => { finishOld = resolve }) : Promise.resolve('next@example.test'))
  openReset()
  await waitFor(() => expect(mocks.verify).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', { name: 'Change link' }))
  await screen.findByText('next@example.test')
  await act(async () => { finishOld('old@example.test') })
  expect(screen.queryByText('old@example.test')).not.toBeInTheDocument()
  await fillPassword()
  submit()
  await screen.findByRole('heading', { name: 'Password updated' })
  expect(mocks.confirm).toHaveBeenCalledWith(expect.anything(), 'next-code', 'Secure123')
})

it('ignores an old confirmation result and clears passwords when the route changes', async () => {
  let finishOld!: () => void
  mocks.confirm.mockReturnValueOnce(new Promise<void>(resolve => { finishOld = resolve }))
  openReset()
  await fillPassword()
  submit()
  fireEvent.click(screen.getByRole('button', { name: 'Change link' }))
  await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith(expect.anything(), 'next-code'))
  expect(await screen.findByLabelText('New Password')).toHaveValue('')
  expect(screen.getByLabelText('Confirm New Password')).toHaveValue('')
  await act(async () => { finishOld() })
  expect(screen.queryByRole('heading', { name: 'Password updated' })).not.toBeInTheDocument()
})

it('blocks submission when only the project query changes', async () => {
  openReset(validQuery, validQuery.replace('project-key', 'other-project-key'))
  await fillPassword()
  fireEvent.click(screen.getByRole('button', { name: 'Change link' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/different Firebase project/i)
  expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
  expect(mocks.confirm).not.toHaveBeenCalled()
})

it('falls back to login for an unsafe continuation', async () => {
  openReset(`${validQuery}&continueUrl=${encodeURIComponent('https://evil.example/phish')}`)
  await fillPassword()
  submit()
  await screen.findByRole('heading', { name: 'Password updated' })
  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/auth/login')
})
