import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { app: { options: { apiKey: 'project-key', projectId: 'care-on-board', messagingSenderId: '524648993620' } }, tenantId: null as string | null },
  complete: vi.fn(),
}))
vi.mock('@/lib/firebase', () => ({ auth: mocks.auth }))
vi.mock('firebase/auth', async () => ({
  ...await vi.importActual<typeof import('firebase/auth')>('firebase/auth'),
  signInWithEmailLink: mocks.complete,
}))
import { completeEmailLinkSignIn, isFamilyEmailLink, readPendingEmail, rememberPendingEmail } from './emailLinkService'

const link = (query = '') => `https://app.joincareonboard.com/auth/family-login?mode=signIn&oobCode=synthetic-code&apiKey=project-key${query}`

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mocks.auth.tenantId = null
  mocks.auth.app.options.projectId = 'care-on-board'
  mocks.complete.mockResolvedValue({ user: { uid: 'family-member' } })
})

it('uses the confirmed email rather than URL identity and clears remembered email after success', async () => {
  rememberPendingEmail('stored@example.test')
  const href = link('&email=attacker%40example.test')
  await completeEmailLinkSignIn(' Confirmed@Example.test ', href)
  expect(mocks.complete).toHaveBeenCalledWith(mocks.auth, 'confirmed@example.test', href)
  expect(readPendingEmail()).toBeNull()
})

it.each([
  link().replace('apiKey=project-key', 'apiKey=foreign-project-key'),
  link('&tenantId=foreign-tenant'),
  link('&apiKey=foreign-project-key'),
  link().replace('mode=signIn', 'mode=verifyEmail'),
  'https://app.joincareonboard.com/auth/family-login',
])('rejects invalid or mismatched sign-in link before signing in', async href => {
  await expect(completeEmailLinkSignIn('member@example.test', href)).rejects.toThrow()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it('validates the actual SDK-parsed nested link context', async () => {
  const href = `https://app.joincareonboard.com/auth/family-login?link=${encodeURIComponent(link().replace('apiKey=project-key', 'apiKey=foreign-project-key'))}`
  await expect(completeEmailLinkSignIn('member@example.test', href)).rejects.toThrow()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it('preserves a valid SDK-parsed nested link when completing sign-in', async () => {
  const href = `https://app.joincareonboard.com/auth/family-login?link=${encodeURIComponent(link())}`
  await completeEmailLinkSignIn('member@example.test', href)
  expect(mocks.complete).toHaveBeenCalledWith(mocks.auth, 'member@example.test', href)
})

it('preserves a valid SDK-supported action query inside the fragment', async () => {
  const href = link().replace('?', '#?')
  await completeEmailLinkSignIn('member@example.test', href)
  expect(mocks.complete).toHaveBeenCalledWith(mocks.auth, 'member@example.test', href)
})

it.each(['mode=signIn', 'oobCode=synthetic-other', 'apiKey=project-key'])('rejects duplicate %s in a fragment action query before signing in', async duplicate => {
  const href = link(`&${duplicate}`).replace('?', '#?')
  await expect(completeEmailLinkSignIn('member@example.test', href)).rejects.toThrow()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it.each(['link', 'deep_link_id'])('rejects duplicate action codes inside fragment-based %s wrappers', async wrapper => {
  const inner = link('&oobCode=synthetic-other').replace('?', '#?')
  const href = `https://app.joincareonboard.com/auth/family-login#?${wrapper}=${encodeURIComponent(inner)}`
  await expect(completeEmailLinkSignIn('member@example.test', href)).rejects.toThrow()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it.each(['link', 'deep_link_id'])('rejects duplicate raw parameters inside an SDK-supported nested wrapper', async wrapper => {
  const href = `https://app.joincareonboard.com/auth/family-login?${wrapper}=${encodeURIComponent(link('&oobCode=synthetic-code'))}`
  await expect(completeEmailLinkSignIn('member@example.test', href)).rejects.toThrow()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it.each(['link', 'deep_link_id'])('preserves valid double-nested SDK-supported wrappers', async wrapper => {
  const innerWrapper = wrapper === 'link' ? 'deep_link_id' : 'link'
  const inner = `https://app.joincareonboard.com/auth/family-login?${innerWrapper}=${encodeURIComponent(link())}`
  const href = `https://app.joincareonboard.com/auth/family-login?${wrapper}=${encodeURIComponent(inner)}`
  await completeEmailLinkSignIn('member@example.test', href)
  expect(mocks.complete).toHaveBeenCalledWith(mocks.auth, 'member@example.test', href)
})

it('accepts a tenant link only when the main auth tenant matches', async () => {
  mocks.auth.tenantId = 'tenant-a'
  await completeEmailLinkSignIn('member@example.test', link('&tenantId=tenant-a'))
  expect(mocks.complete).toHaveBeenCalledOnce()
})

it('rejects a wrongly configured Firebase project', async () => {
  mocks.auth.app.options.projectId = 'other-project'
  await expect(completeEmailLinkSignIn('member@example.test', link())).rejects.toThrow()
  expect(mocks.complete).not.toHaveBeenCalled()
})

it('retains remembered email after a failed redemption', async () => {
  rememberPendingEmail('member@example.test')
  mocks.complete.mockRejectedValue({ code: 'auth/expired-action-code' })
  await expect(completeEmailLinkSignIn('member@example.test', link())).rejects.toEqual({ code: 'auth/expired-action-code' })
  expect(readPendingEmail()).toBe('member@example.test')
})

it('leaves ordinary family login URLs alone', async () => {
  expect(await isFamilyEmailLink('https://app.joincareonboard.com/auth/family-login')).toBe(false)
  expect(mocks.complete).not.toHaveBeenCalled()
})
