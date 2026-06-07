import { useState } from "react"
import { Loader2, Plus, Trash2, Phone, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateClient, type Client, type FamilyPortalContact } from "@/lib/api/clients"

function formatE164(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return digits.startsWith("+") ? raw : `+${digits}`
}

function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

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
    if (!form.primaryPhone.trim()) errors.primaryPhone = "Phone number is required"
    else if (form.primaryPhone.replace(/\D/g, "").length < 10)
      errors.primaryPhone = "Enter a valid phone number (10 digits)"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) return
    const newContact: FamilyPortalContact = {
      name: form.name.trim(),
      primaryPhone: formatE164(form.primaryPhone),
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
                      {displayPhone(contact.primaryPhone)}
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
            <Input
              type="tel"
              placeholder="e.g. (555) 000-1234"
              value={form.primaryPhone}
              onChange={(e) => {
                setForm((f) => ({ ...f, primaryPhone: e.target.value }))
                if (formErrors.primaryPhone) setFormErrors((fe) => ({ ...fe, primaryPhone: undefined }))
              }}
              className="h-10 rounded-xl border-[#e8eaed] bg-[#f8fafb] text-[14px]"
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
    </div>
  )
}
