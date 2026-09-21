/**
 * The Grant Access page: one family member widening access to their client.
 *
 * The rule under test is that either a phone or an email is enough, because
 * that is the whole point of the feature — an agency can onboard a relative
 * who only gave an email, and the portal has to be able to do the same.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FamilyGrantAccessPage from '../index'
import { familyPortalApi, GrantAccessError } from '@/lib/api/family-portal'

vi.mock('@/lib/api/family-portal', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/family-portal')>(
    '@/lib/api/family-portal'
  )
  return { ...actual, familyPortalApi: { grantAccess: vi.fn() } }
})

// vi.hoisted: vi.mock factories are hoisted above these declarations, so a
// plain const here is not initialised by the time the factory runs.
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))

const grantAccess = vi.mocked(familyPortalApi.grantAccess)

const NAME = /e.g. Jane Doe/i
const EMAIL = /e.g. jane@example.com/i

describe('FamilyGrantAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    grantAccess.mockResolvedValue({ success: true })
  })

  const submit = async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add Contact/i }))
    return user
  }

  it('grants access with an email and no phone', async () => {
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await user.type(screen.getByPlaceholderText(EMAIL), 'jane@example.com')
    await submit()

    await waitFor(() => expect(grantAccess).toHaveBeenCalled())
    expect(grantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Doe', email: 'jane@example.com' })
    )
  })

  it('refuses a contact with neither a phone nor an email', async () => {
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await submit()

    expect(
      await screen.findByText(/Add a phone number or an email address so they can sign in/i)
    ).toBeInTheDocument()
    expect(grantAccess).not.toHaveBeenCalled()
  })

  it('refuses a malformed email rather than granting access nobody can use', async () => {
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await user.type(screen.getByPlaceholderText(EMAIL), 'not-an-email')
    await submit()

    expect(await screen.findByText(/Enter a valid email address/i)).toBeInTheDocument()
    expect(grantAccess).not.toHaveBeenCalled()
  })

  it('still requires a name', async () => {
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(EMAIL), 'jane@example.com')
    await submit()

    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument()
    expect(grantAccess).not.toHaveBeenCalled()
  })

  it('names the sign-in method the new contact can actually use', async () => {
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await user.type(screen.getByPlaceholderText(EMAIL), 'jane@example.com')
    await submit()

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(toastSuccess.mock.calls[0][1].description).toMatch(/their email/)
  })

  it('clears the form after a successful grant', async () => {
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await user.type(screen.getByPlaceholderText(EMAIL), 'jane@example.com')
    await submit()

    await waitFor(() => expect(screen.getByPlaceholderText(NAME)).toHaveValue(''))
    expect(screen.getByPlaceholderText(EMAIL)).toHaveValue('')
  })

  it('reports an already-granted contact inline, not as a failure toast', async () => {
    // The outcome they wanted is already true, so a red "failed" banner would
    // misdescribe it.
    grantAccess.mockRejectedValue(
      new GrantAccessError('duplicate', 'That person already has access to this portal.')
    )
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await user.type(screen.getByPlaceholderText(EMAIL), 'jane@example.com')
    await submit()

    expect(await screen.findByText(/already has access to this portal/i)).toBeInTheDocument()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('surfaces the server message when the client is at its contact limit', async () => {
    grantAccess.mockRejectedValue(
      new GrantAccessError('limit-reached', 'This portal already has 25 contacts, which is the limit.')
    )
    const user = userEvent.setup()
    render(<FamilyGrantAccessPage />)
    await user.type(screen.getByPlaceholderText(NAME), 'Jane Doe')
    await user.type(screen.getByPlaceholderText(EMAIL), 'jane@example.com')
    await submit()

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][1].description).toMatch(/25 contacts/)
  })
})
