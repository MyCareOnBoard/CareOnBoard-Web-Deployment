import { useState } from "react"
import { Loader2, Plus, Trash2, Phone, User, Users } from "lucide-react"
import PhoneInput, { isValidPhoneNumber, formatPhoneNumberIntl } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateClient, type Client, type FamilyPortalContact } from "@/lib/api/clients"

type FamilyPortalTabProps = {
  client: Client
  clientId: string
  onClientUpdated?: () => void
}

const emptyForm = { name: "", primaryPhone: "", relationship: "" }

export function FamilyPortalTab({ client, clientId, onClientUpdated }: FamilyPortalTabProps) {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<FamilyPortalContact[]>(
    client.familyPortalContacts ?? []
  )
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<{ name?: string; primaryPhone?: string }>({})
  const [saving, setSaving] = useState(false)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)

  const validate = () => {
    const errors: { name?: string; primaryPhone?: string } = {}
    if (!form.name.trim()) errors.name = "Name is required"
    if (!form.primaryPhone) errors.primaryPhone = "Phone number is required"
    else if (!isValidPhoneNumber(form.primaryPhone))
      errors.primaryPhone = "Enter a valid phone number including country code"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) return
    const newContact: FamilyPortalContact = {
      name: form.name.trim(),
      primaryPhone: form.primaryPhone,
      relationship: form.relationship.trim() || undefined,
    }
    const updated = [...contacts, newContact]
    setSaving(true)
    try {
      await updateClient(clientId, { familyPortalContacts: updated })
      setContacts(updated)
      setForm(emptyForm)
      setFormErrors({})
      toast({ title: "Contact added", description: `${newContact.name} can now access the family portal.` })
      onClientUpdated?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save contact"
      toast({ title: "Failed to add contact", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (index: number) => {
    const updated = contacts.filter((_, i) => i !== index)
    setRemovingIndex(index)
    try {
      await updateClient(clientId, { familyPortalContacts: updated })
      setContacts(updated)
      toast({ title: "Contact removed" })
      onClientUpdated?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove contact"
      toast({ title: "Failed to remove contact", description: msg, variant: "destructive" })
    } finally {
      setRemovingIndex(null)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Existing contacts */}
      <div className="rounded-2xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#00b4b8]" />
          <h3 className="text-[15px] font-semibold text-[#10141a]">Family Portal Access</h3>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-[#808081]">
            No family portal contacts yet. Add a phone number below to grant portal access.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {contacts.map((contact, i) => (
              <li
                key={i}
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
                    <div className="flex items-center gap-1 text-[12px] text-[#808081]">
                      <Phone className="h-3 w-3" />
                      {formatPhoneNumberIntl(contact.primaryPhone) || contact.primaryPhone}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removingIndex === i}
                  onClick={() => void handleRemove(i)}
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  {removingIndex === i ? (
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

      {/* Add contact form */}
      <div className="rounded-2xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#00b4b8]" />
          <h3 className="text-[15px] font-semibold text-[#10141a]">Add Family Portal Contact</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-[#525253]">
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
            <Label className="text-[13px] font-medium text-[#525253]">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <PhoneInput
              international
              defaultCountry="US"
              value={form.primaryPhone || undefined}
              onChange={(value) => {
                setForm((f) => ({ ...f, primaryPhone: value ?? "" }))
                if (formErrors.primaryPhone) setFormErrors((fe) => ({ ...fe, primaryPhone: undefined }))
              }}
              className="phone-input-family"
            />
            {formErrors.primaryPhone && (
              <p className="text-[12px] text-red-600">{formErrors.primaryPhone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-[#525253]">Relationship</Label>
            <Input
              placeholder="e.g. Mother, Brother"
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              className="h-10 rounded-xl border-[#e8eaed] bg-[#f8fafb] text-[14px]"
            />
          </div>
        </div>

        <Button
          type="button"
          disabled={saving}
          onClick={() => void handleAdd()}
          className="mt-4 h-10 rounded-xl bg-[#00b4b8] px-5 text-[14px] font-medium text-white hover:bg-[#00a0a4]"
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

        <p className="mt-3 text-[12px] text-[#808081]">
          The phone number entered here will be used to log in to the family portal via SMS verification.
        </p>
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
