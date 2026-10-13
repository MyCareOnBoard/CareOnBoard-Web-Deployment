import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { User as FirebaseUser } from 'firebase/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ current: null as FirebaseUser | null }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return state.current } } }))

import axiosClient, { axiosClientWithoutAuth } from '@/lib/axios'
import { sendCustomPasswordResetEmail, sendCustomVerificationEmail } from './authEmailService'
import { sendPasswordResetEmail } from './authService'

const originalAdapter = axiosClientWithoutAuth.defaults.adapter
let requests: InternalAxiosRequestConfig[]

beforeEach(() => {
  requests = []
  state.current = {
    uid: 'invited-user', email: 'invited@example.test',
    getIdToken: vi.fn().mockResolvedValue('new-identity-token'),
  } as unknown as FirebaseUser
  axiosClientWithoutAuth.defaults.adapter = async config => {
    requests.push(config)
    return { config, headers: {}, status: 200, statusText: 'OK', data: { success: true } }
  }
})

afterEach(() => {
  axiosClientWithoutAuth.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
})

describe('custom auth email requests', () => {
  it('sends verification with the identity token and invitation continuation before a profile exists', async () => {
    const normalPost = vi.spyOn(axiosClient, 'post')
    await sendCustomVerificationEmail(state.current!, '/agency-care/invitations/signed.token')
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('/authEmail/verification')
    expect(requests[0].headers.Authorization).toBe('Bearer new-identity-token')
    expect(JSON.parse(requests[0].data)).toEqual({ continuePath: '/agency-care/invitations/signed.token' })
    expect(normalPost).not.toHaveBeenCalled()
  })

  it('omits optional continuation when none is supplied', async () => {
    await sendCustomVerificationEmail(state.current!)
    expect(JSON.parse(requests[0].data)).toEqual({})
  })

  it('rejects verification for an identity that is no longer signed in', async () => {
    const user = state.current!
    state.current = null
    await expect(sendCustomVerificationEmail(user)).rejects.toThrow(/sign in|account changed/i)
    expect(user.getIdToken).not.toHaveBeenCalled()
    expect(requests).toHaveLength(0)
  })

  it('does not send a former identity token if the account changes while it loads', async () => {
    const user = state.current!
    vi.mocked(user.getIdToken).mockImplementationOnce(async () => {
      state.current = { uid: 'other-user' } as FirebaseUser
      return 'former-identity-token'
    })
    await expect(sendCustomVerificationEmail(user)).rejects.toThrow(/sign in|account changed/i)
    expect(requests).toHaveLength(0)
  })

  it('sends reset requests publicly without depending on a signed-in identity', async () => {
    state.current = null
    await sendCustomPasswordResetEmail('unknown@example.test')
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('/authEmail/password-reset')
    expect(requests[0].headers.Authorization).toBeUndefined()
    expect(JSON.parse(requests[0].data)).toEqual({ email: 'unknown@example.test' })
  })

  describe.each(['verification', 'password reset'])('%s response contract', kind => {
    it.each<[string, unknown]>([
      ['HTML', '<!doctype html><html><body>Care On Board</body></html>'],
      ['missing success', {}],
      ['false success', { success: false }],
      ['nonboolean success', { success: 'true' }],
    ])('rejects an HTTP 200 with %s instead of claiming the email was sent', async (_label, data) => {
      axiosClientWithoutAuth.defaults.adapter = async config => ({
        config, headers: {}, status: 200, statusText: 'OK', data,
      })
      const send = kind === 'verification'
        ? sendCustomVerificationEmail(state.current!)
        : sendCustomPasswordResetEmail('invited@example.test')
      await expect(send).rejects.toThrow(/delivery|try again/i)
    })
  })

  it.each<[number, RegExp]>([
    [429, /too many|wait.*minutes/i],
    [503, /temporarily unavailable|delivery/i],
    [500, /temporarily unavailable|delivery/i],
  ])('returns an actionable error for email HTTP %i', async (status, message) => {
    axiosClientWithoutAuth.defaults.adapter = async config => {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
        config, headers: {}, status, statusText: 'Error', data: { success: false, error: 'Provider detail' },
      })
    }
    await expect(sendCustomPasswordResetEmail('invited@example.test')).rejects.toThrow(message)
  })

  it('keeps the existing password-reset service contract while using the custom endpoint', async () => {
    const result = await sendPasswordResetEmail('unknown@example.test')
    expect(result).toEqual({ success: true })
    expect(requests[0].url).toBe('/authEmail/password-reset')
  })

  it('returns send failures through the password-reset service error contract', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    axiosClientWithoutAuth.defaults.adapter = async config => {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
        config, headers: {}, status: 429, statusText: 'Error', data: { success: false },
      })
    }
    expect(await sendPasswordResetEmail('invited@example.test')).toEqual({
      success: false, error: expect.stringMatching(/too many|wait.*minutes/i),
    })
  })
})
