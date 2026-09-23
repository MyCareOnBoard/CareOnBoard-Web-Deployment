import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Loader2, Plus, Trash2, UserPlus, Users, User, Phone, Mail } from "lucide-react"
import PhoneInput, { isValidPhoneNumber, formatPhoneNumberIntl } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { selectUser } from "@/utils/auth/store/authSelectors"
import { familyPortalApi, GrantAccessError, type FamilyPortalContact } from "@/lib/api/family-portal"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyForm = { name: "", primaryPhone: "", email: "", relationship: "" }

/** Mirrors the server rule: a contact needs a way to be identified at sign-in. */
type FormErrors = { name?: string; primaryPhone?: string; email?: string; identifier?: string }

/** What the new contact can actually use, so the confirmation is specific. */
function signInMethodLabel(form: { primaryPhone: string; email: string }): string {
  const methods = [form.primaryPhone && "their phone", form.email.trim() && "their email"]
    .filter(Boolean)
  return methods.join(" or ")
}

export default function FamilyGrantAccessPage() {
  const user = useSelector(selectUser)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const [contacts, setContacts] = useState<FamilyPortalContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [removingContact, setRemovingContact] = useState<FamilyPortalContact | null>(null)

  // Every family member can see the client's whole contact list from the
  // server, but this page only shows the ones this signed-in member granted
  // themselves — the people they're personally responsible for having added.
  const myId = user?.id || user?.uid
  const grantedByMe = contacts.filter((c) => myId && c.addedBy === myId)

  useEffect(() => {
    let cancelled = false
    setLoadingContacts(true)
    familyPortalApi
      .listContacts()
      .then((data) => {
        if (!cancelled) setContacts(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        // Surfaced during development while the backend route is still being
        // stood up — keep this until GET /familyPortal/contacts is live, then
        // this branch stops firing and can be removed.
        console.error("familyPortalApi.listContacts failed", status, err)
        setContactsError(
          status === 404
            ? "The access list isn't available yet. Contacts you grant still work — this list will show once the server supports it."
            : "Failed to load the access list. Please try again."
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingContacts(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const validate = () => {
    const errors: FormErrors = {}
    const email = form.email.trim()

    if (!form.name.trim()) errors.name = "Name is required"

    // Either identifier will do — the portal signs people in by phone or by
    // email — but whichever is given has to be usable. A mistyped one is worse
    // than a blank one: it looks like access was granted when nobody can use it.
    if (form.primaryPhone && !isValidPhoneNumber(form.primaryPhone))
      errors.primaryPhone = "Enter a valid phone number including country code"
    if (email && !EMAIL_REGEX.test(email))
      errors.email = "Enter a valid email address"
    if (!form.primaryPhone && !email)
      errors.identifier = "Add a phone number or an email address so they can sign in"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) return
    const name = form.name.trim()
    setSaving(true)
    try {
      const res = await familyPortalApi.grantAccess({
        name,
        primaryPhone: form.primaryPhone,
        email: form.email,
        relationship: form.relationship.trim(),
      })
      setForm(emptyForm)
      setFormErrors({})
      setContacts((prev) => (res.data ? [res.data.contact, ...prev] : prev))
      toast.success("Access granted", {
        description: `${name} can now sign in with ${signInMethodLabel(form)}.`,
      })
    } catch (err: unknown) {
      if (err instanceof GrantAccessError && err.reason === "duplicate") {
        // Not a failure worth a red toast — the outcome they wanted is already
        // true, and the useful place to say so is next to the field.
        setFormErrors({ identifier: "That person already has access to this portal." })
        return
      }
      const description =
        err instanceof GrantAccessError && err.reason === "not-permitted"
          ? "Only a family member with portal access can add someone. Try signing in again."
          : err instanceof Error
            ? err.message
            : "Failed to grant access"
      toast.error("Failed to grant access", { description })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (contact: FamilyPortalContact) => {
    setRemovingContact(contact)
    try {
      await familyPortalApi.revokeAccess({
        id: contact.id,
        primaryPhone: contact.primaryPhone,
        email: contact.email,
      })
      setContacts((prev) => prev.filter((c) => c !== contact))
      toast.success("Access removed", {
        description: `${contact.name} can no longer sign in to this portal.`,
      })
    } catch (err: unknown) {
      const description = err instanceof Error ? err.message : "Failed to remove access"
      toast.error("Failed to remove access", { description })
    } finally {
      setRemovingContact(null)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-[20px] font-bold text-slate-900">Grant Access</h1>

      {/* Access granted so far — same list/card treatment as the agency's
          Family Portal Access tab, scoped to what this member has added. */}
      <div className="rounded-2xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#00b4b8]" />
          <h3 className="text-[15px] font-semibold text-[#10141a]">Access You've Granted</h3>
        </div>

        {loadingContacts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#00b4b8]" />
          </div>
        ) : contactsError ? (
          <p className="text-sm text-red-600">{contactsError}</p>
        ) : grantedByMe.length === 0 ? (
          <p className="text-sm text-[#808081]">
            You haven't granted anyone access yet. Add a phone number or an email address below
            to give a family member portal access.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {grantedByMe.map((contact, i) => (
              <li
                key={`${contact.primaryPhone || contact.email}-${i}`}
                className="flex items-center justify-between rounded-xl border border-[#e8eaed] bg-[#f8fafb] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00b4b8]/10">
                    <User className="h-4 w-4 text-[#00b4b8]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#10141a]">
                      {contact.name}
                      {contact.relationship && (
                        <span className="ml-2 text-[12px] font-normal text-[#808081]">
                          ({contact.relationship})
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#808081]">
                      {contact.primaryPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhoneNumberIntl(contact.primaryPhone) || contact.primaryPhone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removingContact === contact}
                  onClick={() => void handleRemove(contact)}
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  {removingContact === contact ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[#00B4B8]" />
            <p className="text-[15px] font-semibold text-slate-800">Add Family Portal Contact</p>
          </div>
          <p className="mt-0.5 text-[13px] text-slate-400">
            Give another family member access to this portal
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-slate-600">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Jane Doe"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  if (formErrors.name) setFormErrors((fe) => ({ ...fe, name: undefined }))
                }}
                className="h-10 rounded-xl border-[#e8eaed] bg-[#f8fafb] text-[14px]"
              />
              {formErrors.name && <p className="text-[12px] text-red-600">{formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-slate-600">Phone Number</Label>
              <PhoneInput
                international
                defaultCountry="US"
                value={form.primaryPhone || undefined}
                onChange={(value) => {
                  setForm((f) => ({ ...f, primaryPhone: value ?? "" }))
                  if (formErrors.primaryPhone || formErrors.identifier)
                    setFormErrors((fe) => ({ ...fe, primaryPhone: undefined, identifier: undefined }))
                }}
                className="phone-input-family"
              />
              {formErrors.primaryPhone && (
                <p className="text-[12px] text-red-600">{formErrors.primaryPhone}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-slate-600">Email</Label>
              <Input
                type="email"
                placeholder="e.g. jane@example.com"
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }))
                  if (formErrors.email || formErrors.identifier)
                    setFormErrors((fe) => ({ ...fe, email: undefined, identifier: undefined }))
                }}
                className="h-10 rounded-xl border-[#e8eaed] bg-[#f8fafb] text-[14px]"
              />
              {formErrors.email && <p className="text-[12px] text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-slate-600">Relationship</Label>
              <Input
                placeholder="e.g. Mother, Brother"
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                className="h-10 rounded-xl border-[#e8eaed] bg-[#f8fafb] text-[14px]"
              />
            </div>
          </div>

          {formErrors.identifier && (
            <p className="mt-3 text-[12px] text-red-600">{formErrors.identifier}</p>
          )}

          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleAdd()}
            className="mt-4 h-10 rounded-xl bg-[#00B4B8] px-5 text-[14px] font-medium text-white hover:bg-[#00a0a4]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </span>
            )}
          </Button>

          <p className="mt-3 text-[12px] text-slate-400">
            A phone number signs in by SMS code; an email address signs in by a link sent to that
            inbox. Give both and they can use either.
          </p>
        </div>
      </div>

      <style>{`
        .phone-input-family {
          display: flex;
          align-items: center;
          height: 2.5rem;
          border: 1px solid #e8eaed;
          border-radius: 0.75rem;
          background: #f8fafb;
          padding: 0 0.75rem;
          gap: 0.5rem;
        }
        .phone-input-family:focus-within {
          border-color: #00b4b8;
          box-shadow: 0 0 0 2px rgba(0, 180, 184, 0.15);
        }
        .phone-input-family .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.875rem;
          color: #10141a;
          cursor: pointer;
        }
        .phone-input-family .PhoneInputInput {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.875rem;
          color: #10141a;
          min-width: 0;
        }
        .phone-input-family .PhoneInputInput::placeholder {
          color: #b0b3b8;
        }
      `}</style>
    </div>
  )
}
