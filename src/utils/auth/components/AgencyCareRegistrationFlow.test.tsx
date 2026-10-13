import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { User as FirebaseUser } from 'firebase/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const firebase = vi.hoisted(() => ({
  current: null as FirebaseUser | null,
  listeners: new Set<(user: FirebaseUser | null) => void>(),
  create: vi.fn(),
  verify: vi.fn(),
  reload: vi.fn(),
  getToken: vi.fn(),
}))

vi.unmock('react-router')
vi.mock('@/lib/firebase', () => ({ auth: {
  get currentUser() { return firebase.current },
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    firebase.listeners.add(callback)
    queueMicrotask(() => { if (firebase.listeners.has(callback)) callback(firebase.current) })
    return () => firebase.listeners.delete(callback)
  },
} }))
vi.mock('firebase/auth', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/auth')>(),
  createUserWithEmailAndPassword: firebase.create,
  sendEmailVerification: firebase.verify,
  reload: firebase.reload,
  updateProfile: vi.fn(async (user, data) => { user.displayName = data.displayName }),
  multiFactor: () => ({ enrolledFactors: [] }),
}))
// Keep the real context while avoiding unrelated feature imports from the auth barrel.
vi.mock('@/utils/auth', () => import('@/utils/auth/context/AuthContext'))
vi.mock('@/store/redux/store', () => ({ persistor: { purge: vi.fn() } }))
vi.mock('@/features/payroll/api/checkPayrollApi', () => ({
  checkPayrollApi: { util: { resetApiState: () => ({ type: 'payroll/reset' }) } },
}))
vi.mock('@/features/payroll/onboard/payrollOnboardSession', () => ({ clearPayrollOnboardSessions: vi.fn() }))

import axiosClient, { axiosClientWithoutAuth, clearAuthCache } from '@/lib/axios'
import authReducer from '@/utils/auth/store/authSlice'
import { AuthProvider, useAuth } from '@/utils/auth/context/AuthContext'
import { AgencyCareRegistrationForm } from './AgencyCareRegistrationForm'

const invitationPath = '/agency-care/invitations/invite-token'
const originalAdapter = axiosClient.defaults.adapter
const originalEmailAdapter = axiosClientWithoutAuth.defaults.adapter
let authContext: ReturnType<typeof useAuth>

function Probe() {
  authContext = useAuth()
  const location = useLocation()
  return <output data-testid="route">{location.pathname}{location.search}</output>
}

function identity(emailVerified = false): FirebaseUser {
  return {
    uid: 'invited-partner', email: 'partner@example.test', displayName: 'Partner Person',
    emailVerified, getIdToken: firebase.getToken,
    metadata: { creationTime: '2026-10-13T00:00:00Z' }, photoURL: null, phoneNumber: null,
  } as unknown as FirebaseUser
}

describe('invitation registration across AuthProvider and the real profile interceptor', () => {
  let profileExists: boolean
  let requests: InternalAxiosRequestConfig[]
  let emailRequests: InternalAxiosRequestConfig[]
  let missingProfileBody: { error: string; code?: string }
  let publishedRoles: Array<string | undefined>
  let redirect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    firebase.current = null
    firebase.listeners.clear()
    firebase.getToken.mockResolvedValue('invited-partner-token')
    firebase.verify.mockResolvedValue(undefined)
    firebase.reload.mockResolvedValue(undefined)
    firebase.create.mockImplementation(async () => {
      firebase.current = identity()
      for (const listener of [...firebase.listeners]) listener(firebase.current)
      return { user: firebase.current }
    })
    clearAuthCache()
    profileExists = false
    requests = []
    emailRequests = []
    missingProfileBody = { error: 'Unauthorized - User not found' }
    publishedRoles = []
    redirect = vi.fn()
    // jsdom cannot navigate; observe href writes instead of silently ignoring the regression.
    const nativeWindow = window
    const location = {
      pathname: invitationPath, search: '', hash: '',
      get href() { return `http://localhost${invitationPath}` },
      set href(value: string) { redirect(value) },
    }
    vi.stubGlobal('window', new Proxy(nativeWindow, { get(target, key) {
      if (key === 'location') return location
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    } }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    axiosClientWithoutAuth.defaults.adapter = async config => {
      emailRequests.push(config)
      expect(config.url).toBe('/authEmail/verification')
      expect(config.headers.Authorization).toBe('Bearer invited-partner-token')
      expect(JSON.parse(config.data)).toEqual({ continuePath: invitationPath })
      return { config, headers: {}, status: 200, statusText: 'OK', data: { success: true } }
    }
    axiosClient.defaults.adapter = async config => {
      requests.push(config)
      expect(config.headers.Authorization).toBe('Bearer invited-partner-token')
      if (config.method === 'get' && config.url === '/users/profile') {
        const response = { config, headers: {}, status: 401, statusText: 'Unauthorized', data: missingProfileBody }
        if (!profileExists) throw new AxiosError('Request failed with status code 401', AxiosError.ERR_BAD_REQUEST, config, undefined, response)
        return { ...response, status: 200, statusText: 'OK', data: { success: true, user: {
          uid: 'invited-partner', userType: 'agency_care', email: 'partner@example.test', fullName: 'Partner Person',
          createdAt: '2026-10-13T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z',
        } } }
      }
      if (config.method === 'post' && config.url === '/agencyCare/invitations/invite-token/register') {
        expect(firebase.current?.emailVerified).toBe(true)
        expect(authContext.user).toBeNull()
        profileExists = true
        return { config, headers: {}, status: 200, statusText: 'OK', data: { registered: true } }
      }
      throw new Error(`Unexpected request: ${config.method} ${config.url}`)
    }
  })

  afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter
    axiosClientWithoutAuth.defaults.adapter = originalEmailAdapter
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function mount() {
    const store = configureStore({ reducer: { auth: authReducer } })
    store.subscribe(() => publishedRoles.push(store.getState().auth.user?.userType))
    const onRegistered = vi.fn()
    render(<Provider store={store}><MemoryRouter initialEntries={[invitationPath]}><AuthProvider>
      <AgencyCareRegistrationForm token="invite-token" needsOrganization onRegistered={onRegistered} />
      <Probe />
    </AuthProvider></MemoryRouter></Provider>)
    return { store, onRegistered }
  }

  async function finishRegistration() {
    fireEvent.change(screen.getByLabelText('Agency name'), { target: { value: 'Partner Services' } })
    const consent = screen.getByRole('checkbox') as HTMLInputElement
    if (!consent.checked) fireEvent.click(consent)
    fireEvent.click(screen.getByRole('button', { name: /Check email verification|Continue with this account/ }))
    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/auth/mfa-enroll?returnTo=%2Fagency-care%2Finvitations%2Finvite-token'))
    expect(requests.map(request => `${request.method} ${request.url}`)).toEqual([
      'get /users/profile', 'post /agencyCare/invitations/invite-token/register', 'get /users/profile',
    ])
    expect(JSON.parse(requests[1].data)).toEqual({
      organization: { name: 'Partner Services', contactName: 'Partner Person' },
      termsVersion: '2026-10-07', privacyVersion: '2026-10-07', operationId: expect.any(String),
    })
    expect(authContext.user).toMatchObject({ uid: 'invited-partner', userType: 'agency_care', emailVerified: true })
    expect(publishedRoles).not.toContain('applicant')
    expect(redirect).not.toHaveBeenCalled()
  }

  it('stays on the invitation while Firebase has an identity but the backend profile is still missing', async () => {
    const { store, onRegistered } = mount()
    await screen.findByRole('button', { name: 'Create account' })
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Partner Person' } })
    fireEvent.change(screen.getByLabelText('Agency name'), { target: { value: 'Partner Services' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'partner@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(emailRequests).toHaveLength(1))
    expect(firebase.verify).not.toHaveBeenCalled()
    await waitFor(() => expect(requests.length).toBeGreaterThan(0))
    await act(async () => {})
    expect(redirect).not.toHaveBeenCalled()
    expect(requests).toHaveLength(1)
    expect(screen.getByTestId('route')).toHaveTextContent(invitationPath)
    expect(authContext.user).toBeNull()
    expect(store.getState().auth.user).toBeNull()
    expect(publishedRoles).not.toContain('applicant')
    expect(profileExists).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Check email verification' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('Verify your email')
    expect(requests).toHaveLength(1)
    Object.assign(firebase.current!, { emailVerified: true })
    await finishRegistration()
    expect(firebase.create).toHaveBeenCalledOnce()
    expect(onRegistered).not.toHaveBeenCalled()
  })

  it('resumes a verified Firebase identity with no backend profile without creating another identity', async () => {
    missingProfileBody.code = 'USER_PROFILE_NOT_FOUND'
    firebase.current = identity(true)
    const { onRegistered } = mount()
    await screen.findByRole('button', { name: 'Continue with this account' })
    expect(redirect).not.toHaveBeenCalled()
    expect(authContext.user).toBeNull()
    await finishRegistration()
    expect(firebase.create).not.toHaveBeenCalled()
    expect(firebase.verify).not.toHaveBeenCalled()
    expect(onRegistered).not.toHaveBeenCalled()
  })
})
