import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { app: { options: { apiKey: 'project-key', projectId: 'care-on-board', messagingSenderId: '524648993620' } }, tenantId: null, emulatorConfig: null },
  apps: [] as any[], initializeApp: vi.fn(), initializeAuth: vi.fn(), emulator: vi.fn(),
}))
vi.mock('@/lib/firebase', () => ({ auth: mocks.auth }))
vi.mock('firebase/app', () => ({ getApps: () => mocks.apps, initializeApp: mocks.initializeApp }))
vi.mock('firebase/auth', () => ({ initializeAuth: mocks.initializeAuth, inMemoryPersistence: 'memory', connectAuthEmulator: mocks.emulator }))
import { continuationPath, emailActionProblem, getEmailActionAuth } from './emailAction'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.apps = []
  mocks.initializeApp.mockImplementation((options, name) => ({ options, name }))
  mocks.initializeAuth.mockReturnValue({ tenantId: null, languageCode: null })
})

it.each(['/auth/login', '/auth/family-login', '/auth/forgot-password', '/agency-care', '/agency-care/clients', '/agency-care/invitations/payload.signature', '/agency-care/networks/network-1/conversations'])('allows approved destination %s', path => {
  expect(continuationPath(`https://app.joincareonboard.com${path}`)).toBe(path)
})
it('preserves invitation continuation query and hash', () => {
  expect(continuationPath('/agency-care/invitations/payload.signature?tab=welcome#details')).toBe('/agency-care/invitations/payload.signature?tab=welcome#details')
})
it.each([null, 'https://evil.example/phish', '//evil.example', 'javascript:alert(1)', 'https://app.joincareonboard.com@evil.example', '/\\evil.example', '/%2f%2fevil.example', '/agency-care/invitations/%2e%2e/auth/action', '/unapproved', '/auth/action?mode=verifyEmail', '/auth/login?returnTo=https://evil.example', '/auth/family-login?oobCode=other', '/agency-care/clients/../..', '/auth/login\n'])('rejects unapproved or unsafe continuation %s', value => {
  expect(continuationPath(value)).toBe('/auth/login')
})
it.each(['resetPassword', 'verifyEmail', 'recoverEmail', 'revertSecondFactorAddition', 'verifyAndChangeEmail', 'signIn'])('accepts supported mode %s', mode => {
  expect(emailActionProblem(new URLSearchParams({ mode, oobCode: 'synthetic-code', apiKey: 'project-key' }))).toBe('')
})
it.each(['mode=verifyEmail', 'oobCode=code', 'mode=verifyEmail&oobCode=code&oobCode=other', 'mode=verifyEmail&oobCode=code&apiKey=foreign', 'mode=verifyEmail&oobCode=code&tenantId=bad%20tenant'])('rejects missing, duplicate or wrong-context parameters %s', query => {
  expect(emailActionProblem(new URLSearchParams(query))).not.toBe('')
})
it('explains unsupported modes', () => {
  expect(emailActionProblem(new URLSearchParams('mode=unsupported&oobCode=code'))).toMatch(/not supported/i)
})
it('does not forward tenant email sign-in into the default family identity', () => {
  expect(emailActionProblem(new URLSearchParams('mode=signIn&oobCode=code&tenantId=tenant-a'))).toMatch(/tenant/i)
})
it('uses an isolated in-memory auth instance with the pinned project and tenant', () => {
  const context = getEmailActionAuth(new URLSearchParams('tenantId=tenant-a&lang=es'))
  expect(mocks.initializeApp).toHaveBeenCalledWith(mocks.auth.app.options, expect.any(String))
  expect(mocks.initializeAuth).toHaveBeenCalledWith(expect.anything(), { persistence: 'memory' })
  expect(context.tenantId).toBe('tenant-a')
  expect(context.languageCode).toBe('es')
  expect(mocks.auth.tenantId).toBeNull()
})
