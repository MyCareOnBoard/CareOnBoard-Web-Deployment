import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
const state = vi.hoisted(() => ({ uid: 'provider-1' as string | null, getToken: vi.fn() }))
vi.mock('@/utils/auth/services/authService', () => ({ getIdToken: state.getToken }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return state.uid ? { uid: state.uid } : null }, onAuthStateChanged: () => () => {} } }))
vi.mock('@/utils/auth/helpers/handleMfaApiError', () => ({ handleMfaApiError: () => false }))
import axiosClient, { clearAuthCache } from './axios'

const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }))
beforeEach(() => { clearAuthCache(); adapter.mockClear(); state.uid = 'provider-1'; state.getToken.mockReset().mockResolvedValue('provider-token') })
afterEach(() => { window.history.replaceState(null, '', '/') })

it.each([
  { code: 'USER_PROFILE_NOT_FOUND' },
  { error: 'Unauthorized - User not found' },
])('allows a profile bootstrap probe to report unfinished registration without retry: %j', async data => {
  window.history.replaceState(null, '', '/auth/login')
  const profileAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    throw { isAxiosError: true, response: { status: 401, data }, config }
  })
  const options = { adapter: profileAdapter, allowMissingProfile: true }
  await expect(axiosClient.get('/users/profile', options)).rejects.toMatchObject({ response: { status: 401 } })
  expect(profileAdapter).toHaveBeenCalledOnce()
  expect(state.getToken).toHaveBeenCalledOnce()
})

it.each([
  { url: '/users/profile', data: { error: 'Unauthorized - Invalid token' } },
  { url: '/agency/private', data: { code: 'USER_PROFILE_NOT_FOUND' } },
])('keeps normal token recovery for $url even when the bootstrap flag is set', async ({ url, data }) => {
  window.history.replaceState(null, '', '/auth/login')
  const rejectedAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    throw { isAxiosError: true, response: { status: 401, data }, config }
  })
  const options = { adapter: rejectedAdapter, allowMissingProfile: true }
  await expect(axiosClient.get(url, options)).rejects.toMatchObject({ response: { status: 401 } })
  expect(rejectedAdapter).toHaveBeenCalledTimes(2)
  expect(state.getToken).toHaveBeenNthCalledWith(2, true)
})

it('uses the new account token instead of a cached provider token after UID changes', async () => {
  await axiosClient.get('/users/profile', { adapter })
  expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer provider-token')
  state.uid = 'partner-1'
  state.getToken.mockResolvedValue('partner-token')
  await axiosClient.get('/users/profile', { adapter })
  expect(adapter.mock.calls[1][0].headers.Authorization).toBe('Bearer partner-token')
})

it('does not send or cache a token whose UID changed while it was loading', async () => {
  let finish!: (token: string) => void
  state.getToken.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const pending = axiosClient.get('/users/profile', { adapter })
  await vi.waitFor(() => expect(state.getToken).toHaveBeenCalledOnce())
  state.uid = 'partner-1'
  finish('old-provider-token')
  await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' })
  expect(adapter).not.toHaveBeenCalled()
  state.getToken.mockResolvedValue('partner-token')
  await axiosClient.get('/users/profile', { adapter })
  expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer partner-token')
})

it('does not retry a rejected old-account request with the newly signed-in account', async () => {
  const oldRequest = vi.fn(async (config: InternalAxiosRequestConfig) => {
    state.uid = 'partner-1'
    throw { isAxiosError: true, response: { status: 401 }, config }
  })
  await expect(axiosClient.get('/agency/private', { adapter: oldRequest })).rejects.toMatchObject({ response: { status: 401 } })
  expect(oldRequest).toHaveBeenCalledOnce()
  expect(state.getToken).toHaveBeenCalledOnce()
})

it('refreshes and retries once under the same UID after a stale token response', async () => {
  state.getToken.mockResolvedValueOnce('stale-token').mockResolvedValueOnce('fresh-token')
  let attempts = 0
  const retryAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    if (++attempts === 1) throw { isAxiosError: true, response: { status: 401 }, config }
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  })
  await axiosClient.get('/users/profile', { adapter: retryAdapter })
  expect(retryAdapter).toHaveBeenCalledTimes(2)
  expect(state.getToken).toHaveBeenNthCalledWith(1, false)
  expect(state.getToken).toHaveBeenNthCalledWith(2, true)
  expect(retryAdapter.mock.calls[1][0].headers.Authorization).toBe('Bearer fresh-token')
})
