import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
const mocks = vi.hoisted(() => ({ user: { userType: 'agency_care' }, ready: true, emailVerified: true }))
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }))
vi.mock('@/hooks/useRequireMfaEnrolled', () => ({ useRequireMfaEnrolled: () => ({ ready: mocks.ready }) }))
vi.mock('@/lib/firebase', () => ({ auth: { get currentUser() { return { uid: 'partner-1', emailVerified: mocks.emailVerified } } } }))
vi.mock('@/utils/auth/components/AgencyCareEmailVerification', () => ({ AgencyCareEmailVerification: () => <div>Verify existing care email</div> }))
import { ProtectedRoute } from './ProtectedRoute'

function mount(allowAgencyCare = false) {
  render(<MemoryRouter initialEntries={['/agency/dashboard']}><Routes>
    <Route path="/agency/dashboard" element={<ProtectedRoute allowAgencyCare={allowAgencyCare}><div>Private product data</div></ProtectedRoute>} />
    <Route path="/agency-care" element={<div>Agency Care portal</div>} />
  </Routes></MemoryRouter>)
}
describe('external account route isolation', () => {
  it('redirects a limited identity before protected product children mount', () => {
    mocks.user = { userType: 'agency_care' }
    mount()
    expect(screen.getByText('Agency Care portal')).toBeInTheDocument()
    expect(screen.queryByText('Private product data')).not.toBeInTheDocument()
  })
  it('allows an explicitly opted-in care surface', () => {
    mocks.user = { userType: 'agency_care' }
    mount(true)
    expect(screen.getByText('Private product data')).toBeInTheDocument()
  })
  it('preserves internal user access', () => {
    mocks.user = { userType: 'employee' }
    mount()
    expect(screen.getByText('Private product data')).toBeInTheDocument()
  })
  it('holds unverified internal and external accounts before care children mount', () => {
    mocks.user = { userType: 'employee' }
    mocks.emailVerified = false
    mount(true)
    expect(screen.getByText('Verify existing care email')).toBeInTheDocument()
    expect(screen.queryByText('Private product data')).not.toBeInTheDocument()
    mocks.emailVerified = true
  })
})
