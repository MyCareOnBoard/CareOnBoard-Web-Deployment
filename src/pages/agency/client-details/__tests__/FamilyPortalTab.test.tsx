/**
 * Family portal access: a contact is reachable by phone, by email, or by both.
 *
 * The rule these tests protect is that exactly one identifier is enough. Getting
 * it wrong in either direction is costly: demand both and an agency cannot grant
 * access to a relative who only gave an email; demand neither and a contact is
 * saved that nobody can ever sign in as.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FamilyPortalTab } from '../tabs/FamilyPortalTab'
import * as clientsApi from '@/lib/api/clients'
import type { Client } from '@/lib/api/clients'

vi.mock('@/lib/api/clients', async () => {
  const actual = await vi.importActual<typeof clientsApi>('@/lib/api/clients')
  return { ...actual, updateClient: vi.fn() }
})

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))

const updateClient = vi.mocked(clientsApi.updateClient)

const CLIENT_ID = 'client-1'
const baseClient = (contacts: clientsApi.FamilyPortalContact[] = []) =>
  ({ id: CLIENT_ID, familyPortalContacts: contacts }) as Client

/** The contacts array the component tried to persist. */
const savedContacts = () =>
  (updateClient.mock.calls.at(-1)?.[1] as { familyPortalContacts: clientsApi.FamilyPortalContact[] })
    .familyPortalContacts

async function addContact(fill: (u: ReturnType<typeof userEvent.setup>) => Promise<void>) {
  const user = userEvent.setup()
  render(<FamilyPortalTab client={baseClient()} clientId={CLIENT_ID} />)
  await user.type(screen.getByPlaceholderText(/Jane Doe/i), 'Jane Doe')
  await fill(user)
  await user.click(screen.getByRole('button', { name: /Add Contact/i }))
  return user
}

describe('FamilyPortalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateClient.mockResolvedValue({} as never)
  })

  it('saves a contact with an email and no phone', async () => {
    await addContact(async (user) => {
      await user.type(screen.getByPlaceholderText(/jane@example.com/i), 'Mum@Example.com')
    })

    await waitFor(() => expect(updateClient).toHaveBeenCalled())
    expect(savedContacts()[0]).toMatchObject({ name: 'Jane Doe', email: 'mum@example.com' })
    // Not sent as an empty string: the server requires one of the two, and ""
    // would satisfy that check while being unusable.
    expect(savedContacts()[0].primaryPhone).toBeUndefined()
  })

  it('lower-cases the email, because sign-in matches on it', async () => {
    await addContact(async (user) => {
      await user.type(screen.getByPlaceholderText(/jane@example.com/i), 'MiXeD@Case.COM')
    })
    await waitFor(() => expect(updateClient).toHaveBeenCalled())
    expect(savedContacts()[0].email).toBe('mixed@case.com')
  })

  it('refuses a contact with neither a phone nor an email', async () => {
    await addContact(async () => {})

    expect(
      await screen.findByText(/Add a phone number or an email address so they can sign in/i)
    ).toBeInTheDocument()
    expect(updateClient).not.toHaveBeenCalled()
  })

  it('refuses a malformed email rather than granting access nobody can use', async () => {
    await addContact(async (user) => {
      await user.type(screen.getByPlaceholderText(/jane@example.com/i), 'not-an-email')
    })

    expect(await screen.findByText(/Enter a valid email address/i)).toBeInTheDocument()
    expect(updateClient).not.toHaveBeenCalled()
  })

  it('still requires a name', async () => {
    const user = userEvent.setup()
    render(<FamilyPortalTab client={baseClient()} clientId={CLIENT_ID} />)
    await user.type(screen.getByPlaceholderText(/jane@example.com/i), 'mum@example.com')
    await user.click(screen.getByRole('button', { name: /Add Contact/i }))

    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument()
    expect(updateClient).not.toHaveBeenCalled()
  })

  it('lists both identifiers for a contact that has them', () => {
    render(
      <FamilyPortalTab
        client={baseClient([
          { name: 'Jane Doe', primaryPhone: '+15550100', email: 'jane@example.com', relationship: 'Mother' },
        ])}
        clientId={CLIENT_ID}
      />
    )
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/555/)).toBeInTheDocument()
  })

  it('renders a phone-only contact recorded before email existed', () => {
    // These are already in the database; the tab must not assume an email.
    render(
      <FamilyPortalTab
        client={baseClient([{ name: 'Old Contact', primaryPhone: '+15550100' }])}
        clientId={CLIENT_ID}
      />
    )
    expect(screen.getByText('Old Contact')).toBeInTheDocument()
    expect(screen.getByText(/555/)).toBeInTheDocument()
  })
})
