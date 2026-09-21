import { useState } from "react"
import { Loader2, Plus, UserPlus } from "lucide-react"
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { familyPortalApi, GrantAccessError } from "@/lib/api/family-portal"

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
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

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
      await familyPortalApi.grantAccess({
        name,
        primaryPhone: form.primaryPhone,
        email: form.email,
        relationship: form.relationship.trim(),
      })
      setForm(emptyForm)
      setFormErrors({})
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

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-[20px] font-bold text-slate-900">Grant Access</h1>

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
