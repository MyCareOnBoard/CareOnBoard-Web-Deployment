import { useEffect, useState } from 'react'
import { transferableAbortController } from 'node:util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, NavLink, RouterProvider } from 'react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'

const mocks = vi.hoisted(() => ({
  auth: {
    authStateReady: vi.fn(),
    currentUser: { uid: 'u1', emailVerified: true } as { uid: string; emailVerified: boolean } | null,
  },
  hasEnrolledMfa: vi.fn(),
  loadWorkspace: vi.fn(),
}))

vi.unmock('react-router')
vi.mock('@/lib/firebase', () => ({ auth: mocks.auth }))
vi.mock('@/utils/auth', () => ({
  useAuth: () => ({
    user: mocks.auth.currentUser && { uid: mocks.auth.currentUser.uid, userType: 'agency_care' },
    loading: false,
  }),
}))
vi.mock('@/utils/auth/services/mfaService', () => ({ hasEnrolledMfa: mocks.hasEnrolledMfa }))
vi.mock('@/utils/auth/components/AgencyCareEmailVerification', () => ({
  AgencyCareEmailVerification: () => <p>Verify email</p>,
}))

function Workspace() {
  useEffect(() => { mocks.loadWorkspace() }, [])
  return <>
    <h1>Client workspace</h1>
    <nav aria-label="Client tabs">
      <NavLink to="/agency-care/networks/client/documents">Documents</NavLink>
      <NavLink to="/agency-care/networks/client/updates?create=1">Updates</NavLink>
    </nav>
  </>
}

function Gate() {
  const [, refreshIdentity] = useState(0)
  return <>
    <button onClick={() => refreshIdentity(value => value + 1)}>Refresh identity</button>
    <ProtectedRoute allowAgencyCare><Workspace /></ProtectedRoute>
  </>
}

function mount(path = '/agency-care/networks/client/overview') {
  const router = createMemoryRouter([
    { path: '/auth/login', element: <p>Sign in</p> },
    { path: '/auth/mfa-enroll', element: <p>Enroll MFA</p> },
    { path: '*', element: <Gate /> },
  ], { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('useRequireMfaEnrolled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Router requests use Node's Request, so their signals must use the same realm.
    vi.stubGlobal('AbortController', transferableAbortController().constructor)
    mocks.auth.currentUser = { uid: 'u1', emailVerified: true }
    mocks.auth.authStateReady.mockReset().mockResolvedValue(undefined)
    mocks.hasEnrolledMfa.mockReset().mockResolvedValue(true)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('blocks initial content until the signed-in identity is enrolled', async () => {
    mount()
    expect(screen.queryByRole('heading', { name: 'Client workspace' })).not.toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Client workspace' })
  })

  it('redirects an unenrolled identity without mounting protected content', async () => {
    mocks.hasEnrolledMfa.mockResolvedValue(false)
    const router = mount('/agency/dashboard')
    await screen.findByText('Enroll MFA')
    expect(router.state.location.pathname).toBe('/auth/mfa-enroll')
    expect(router.state.location.search).toBe('')
    expect(mocks.loadWorkspace).not.toHaveBeenCalled()
  })

  it('keeps protected content and its client request mounted across tab and query navigation', async () => {
    mount()
    const header = await screen.findByRole('heading', { name: 'Client workspace' })
    fireEvent.click(screen.getByRole('link', { name: 'Documents' }))
    await act(async () => {})
    expect(screen.getByRole('heading', { name: 'Client workspace' })).toBe(header)
    fireEvent.click(screen.getByRole('link', { name: 'Updates' }))
    await act(async () => {})
    expect(screen.getByRole('heading', { name: 'Client workspace' })).toBe(header)
    expect(mocks.loadWorkspace).toHaveBeenCalledTimes(1)
    expect(mocks.hasEnrolledMfa).toHaveBeenCalledTimes(1)
  })

  it.each([
    { uid: 'u1', destination: '/auth/mfa-enroll' },
    { uid: 'u2', destination: '/auth/mfa-enroll' },
    { uid: null, destination: '/auth/login' },
  ])('blocks a replaced identity ($uid) before checking or redirecting it', async ({ uid, destination }) => {
    const router = mount('/agency-care/networks/client/documents?submission=one')
    await screen.findByRole('heading', { name: 'Client workspace' })
    const enrolled = deferred<boolean>()
    mocks.hasEnrolledMfa.mockReturnValueOnce(enrolled.promise)
    mocks.auth.currentUser = uid ? { uid, emailVerified: true } : null
    fireEvent.click(screen.getByRole('button', { name: 'Refresh identity' }))
    expect(screen.queryByRole('heading', { name: 'Client workspace' })).not.toBeInTheDocument()
    await act(async () => { enrolled.resolve(false) })
    await waitFor(() => expect(router.state.location.pathname).toBe(destination))
    expect(router.state.location.search).toBe('?returnTo=%2Fagency-care%2Fnetworks%2Fclient%2Fdocuments%3Fsubmission%3Done')
    expect(mocks.loadWorkspace).toHaveBeenCalledTimes(1)
  })

  it("does not let an old identity's late success mount content for the next account", async () => {
    const oldCheck = deferred<boolean>()
    mocks.hasEnrolledMfa.mockReturnValueOnce(oldCheck.promise)
    const router = mount()
    await waitFor(() => expect(mocks.hasEnrolledMfa).toHaveBeenCalledTimes(1))
    mocks.auth.currentUser = { uid: 'u2', emailVerified: true }
    mocks.hasEnrolledMfa.mockResolvedValue(false)
    await act(async () => { oldCheck.resolve(true) })
    expect(screen.queryByRole('heading', { name: 'Client workspace' })).not.toBeInTheDocument()
    expect(mocks.loadWorkspace).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh identity' }))
    await screen.findByText('Enroll MFA')
    expect(router.state.location.search).toBe('?returnTo=%2Fagency-care%2Fnetworks%2Fclient%2Foverview')
  })

  it('redirects a pending check to the latest tab and query continuation', async () => {
    const enrolled = deferred<boolean>()
    mocks.hasEnrolledMfa.mockReturnValueOnce(enrolled.promise)
    const router = mount()
    await waitFor(() => expect(mocks.hasEnrolledMfa).toHaveBeenCalledTimes(1))
    await act(() => router.navigate('/agency-care/networks/client/updates?create=1'))
    await act(async () => { enrolled.resolve(false) })
    await screen.findByText('Enroll MFA')
    expect(router.state.location.search).toBe('?returnTo=%2Fagency-care%2Fnetworks%2Fclient%2Fupdates%3Fcreate%3D1')
    expect(mocks.hasEnrolledMfa).toHaveBeenCalledTimes(1)
    expect(mocks.loadWorkspace).not.toHaveBeenCalled()
  })
})
