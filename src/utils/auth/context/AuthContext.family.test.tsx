import { act, render, screen, waitFor } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { User as FirebaseUser } from 'firebase/auth'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  current: null as FirebaseUser | null,
  listeners: new Set<(user: FirebaseUser | null) => void>(),
  getUser: vi.fn(), post: vi.fn(), complete: vi.fn(), detect: vi.fn(),
}))
vi.unmock('react-router')
vi.mock('@/lib/firebase', () => ({ auth: {
  get currentUser() { return mocks.current },
  tenantId: null,
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    mocks.listeners.add(callback)
    queueMicrotask(() => { if (mocks.listeners.has(callback)) callback(mocks.current) })
    return () => mocks.listeners.delete(callback)
  },
} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn(), reload: vi.fn() }))
vi.mock('@/utils/auth', () => import('./AuthContext'))
vi.mock('@/store/redux/store', () => ({ persistor: { purge: vi.fn() } }))
vi.mock('@/features/payroll/api/checkPayrollApi', () => ({
  checkPayrollApi: { util: { resetApiState: () => ({ type: 'payroll/reset' }) } },
}))
vi.mock('@/features/payroll/onboard/payrollOnboardSession', () => ({ clearPayrollOnboardSessions: vi.fn() }))
vi.mock('@/lib/api/users', () => ({ getUser: mocks.getUser }))
vi.mock('@/lib/axios', () => ({
  clearAuthCache: vi.fn(),
  default: { post: mocks.post, get: vi.fn(async () => ({ data: { data: { firstName: 'Client', lastName: 'Person' } } })) },
}))
vi.mock('@/utils/auth/services/emailLinkService', () => ({
  isFamilyEmailLink: mocks.detect, completeEmailLinkSignIn: mocks.complete,
  readPendingEmail: () => null, sendFamilySignInLink: vi.fn(), signInWithPassword: vi.fn(),
}))
vi.mock('@/utils/auth/services/mfaService', () => ({ createRecaptchaVerifier: vi.fn(), clearRecaptchaVerifier: vi.fn() }))
vi.mock('@/utils/auth/services/phoneAuthService', () => ({ startPhoneSignIn: vi.fn(), completePhoneSignIn: vi.fn() }))
vi.mock('@/pages/auth/components/RecaptchaAnchor', () => ({ RecaptchaAnchor: () => null }))
vi.mock('@/components/AnnouncementBanner', () => ({ default: () => null }))

import authReducer from '@/utils/auth/store/authSlice'
import FamilyLoginPage from '@/pages/auth/family-login'
import FamilyLayout from '@/layouts/FamilyLayout'
import { AuthProvider, useAuth } from './AuthContext'
import { UserType, type User } from '@/utils/auth/types/user.types'

const familyProfile = {
  uid: 'family-member', userType: 'family_member', fullName: 'Family Person',
  email: 'family@example.test', emailVerified: true, clientId: 'client-1',
}
let authContext: ReturnType<typeof useAuth>

function Probe() {
  authContext = useAuth()
  const location = useLocation()
  return <output data-testid="route">{location.pathname}</output>
}

function mount() {
  const store = configureStore({ reducer: { auth: authReducer } })
  render(<Provider store={store}><MemoryRouter initialEntries={['/auth/family-login']}><AuthProvider>
    <Probe />
    <Routes>
      <Route path="/auth/family-login" element={<FamilyLoginPage />} />
      <Route element={<FamilyLayout />}><Route path="/family/dashboard" element={<p>Family dashboard content</p>} /></Route>
    </Routes>
  </AuthProvider></MemoryRouter></Provider>)
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.current = null
  mocks.listeners.clear()
  mocks.getUser.mockReset()
  mocks.detect.mockResolvedValue(true)
  mocks.complete.mockImplementation(async () => {
    mocks.detect.mockResolvedValue(false)
    mocks.current = { uid: 'family-member', tenantId: null } as FirebaseUser
    for (const listener of [...mocks.listeners]) listener(mocks.current)
    return { user: mocks.current }
  })
  mocks.post.mockResolvedValue({ data: { data: familyProfile } })
  vi.spyOn(window, 'prompt').mockReturnValue('family@example.test')
})

it('keeps verified family access when an earlier missing-profile request fails afterward', async () => {
  let rejectProfile!: (reason: unknown) => void
  mocks.getUser.mockReturnValue(new Promise((_resolve, reject) => { rejectProfile = reject }))
  const store = mount()
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce())
  await waitFor(() => expect(store.getState().auth.user).toMatchObject(familyProfile))
  await screen.findByText('Family dashboard content')
  expect(store.getState().auth.user).toMatchObject(familyProfile)

  await act(async () => { rejectProfile({ response: { status: 401, data: { code: 'USER_PROFILE_NOT_FOUND' } } }) })

  expect(store.getState().auth.user).toMatchObject(familyProfile)
  expect(authContext.user).toMatchObject(familyProfile)
  expect(screen.getByTestId('route')).toHaveTextContent('/family/dashboard')
  expect(screen.getByText('Family dashboard content')).toBeInTheDocument()
})

it('rejects a family profile from the previous Firebase identity after an account switch', async () => {
  mocks.getUser.mockReturnValueOnce(new Promise(() => {}))
  const store = mount()
  await screen.findByText('Family dashboard content')
  mocks.getUser.mockRejectedValueOnce(new Error('No profile for the replacement account'))

  await act(async () => {
    mocks.current = { uid: 'replacement-member', tenantId: null } as FirebaseUser
    for (const listener of [...mocks.listeners]) listener(mocks.current)
  })

  expect(() => authContext.acceptFamilyProfile(familyProfile as User)).toThrow(/account changed/i)
  expect(store.getState().auth.user).toBeNull()
  expect(authContext.user).toBeNull()
  expect(screen.getByTestId('route')).toHaveTextContent('/auth/family-login')
})

it('rejects a verified response with another role without replacing the family profile', async () => {
  mocks.getUser.mockReturnValueOnce(new Promise(() => {}))
  const store = mount()
  await screen.findByText('Family dashboard content')

  expect(() => authContext.acceptFamilyProfile({ ...familyProfile, userType: UserType.EMPLOYEE } as User)).toThrow(/not a family member/i)

  expect(store.getState().auth.user).toMatchObject(familyProfile)
  expect(authContext.user).toMatchObject(familyProfile)
})
