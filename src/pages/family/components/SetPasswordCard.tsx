/**
 * Offers a family member who signed in by email link the option of a password.
 *
 * Without this the password half of the sign-in screen is unreachable: an account
 * created by a magic link has no password credential, so there would be nothing
 * to type there. It is an offer rather than a step — the link keeps working
 * whether or not they ever set one — and it is dismissible, because a relative
 * checking a schedule twice a year should not be nagged into managing a secret.
 *
 * Only shown to accounts that signed in with an email and have no password yet;
 * phone-only members never see it.
 */
import {useState} from "react"
import {KeyRound, Loader2, X} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {useToast} from "@/hooks/use-toast"
import {auth} from "@/lib/firebase"
import {attachPassword, hasPasswordProvider} from "@/utils/auth/services/emailLinkService"

/** Firebase rejects anything shorter, and says so in a less helpful way. */
const MIN_PASSWORD_LENGTH = 8

const DISMISSED_KEY = "familyPortal.passwordOfferDismissed"

function wasDismissed(): boolean {
    try {
        return window.localStorage.getItem(DISMISSED_KEY) === "true"
    } catch {
        return false
    }
}

function rememberDismissal(): void {
    try {
        window.localStorage.setItem(DISMISSED_KEY, "true")
    } catch {
        // A browser that will not store the dismissal shows the offer again next
        // visit. Mildly annoying, not broken.
    }
}

export function SetPasswordCard() {
    const {toast} = useToast()
    const [dismissed, setDismissed] = useState(wasDismissed)
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    const user = auth.currentUser
    const eligible = Boolean(user?.email) && !hasPasswordProvider()
    if (!eligible || dismissed) return null

    const handleSave = async () => {
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Use at least ${MIN_PASSWORD_LENGTH} characters`)
            return
        }
        setError("")
        setSaving(true)
        try {
            await attachPassword(password)
            setPassword("")
            setDismissed(true)
            rememberDismissal()
            toast({
                title: "Password set",
                description: "Next time you can sign in with your email and password.",
            })
        } catch (err: unknown) {
            const code = (err as {code?: string}).code
            // Firebase requires a recent sign-in before it will attach a credential.
            setError(
                code === "auth/requires-recent-login"
                    ? "For security, sign in again with a fresh link before setting a password."
                    : err instanceof Error ? err.message : "Could not set your password"
            )
        } finally {
            setSaving(false)
        }
    }

    const handleDismiss = () => {
        setDismissed(true)
        rememberDismissal()
    }

    return (
        <div className="relative rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
                <X className="h-4 w-4"/>
            </button>

            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00b4b8]/10">
                    <KeyRound className="h-4 w-4 text-[#00b4b8]"/>
                </div>
                <div className="flex-1">
                    <p className="text-[15px] font-semibold text-[#10141a]">
                        Set a password for faster sign-in
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#808081]">
                        You signed in with a link sent to {user?.email}. Set a password and you can sign
                        in directly next time — the link will keep working either way.
                    </p>

                    {!open ? (
                        <Button
                            type="button"
                            onClick={() => setOpen(true)}
                            className="mt-3 h-9 rounded-xl bg-[#00b4b8] px-4 text-[13px] font-medium text-white hover:bg-[#00a0a4]"
                        >
                            Set a password
                        </Button>
                    ) : (
                        <div className="mt-3 space-y-2">
                            <Label className="text-[13px] font-medium text-[#525253]">New password</Label>
                            <Input
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    if (error) setError("")
                                }}
                                className="h-10 max-w-sm rounded-xl border-[#e8eaed] bg-[#f8fafb] text-[14px]"
                            />
                            {error && <p className="text-[12px] text-red-600">{error}</p>}
                            <div className="flex gap-2 pt-1">
                                <Button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void handleSave()}
                                    className="h-9 rounded-xl bg-[#00b4b8] px-4 text-[13px] font-medium text-white hover:bg-[#00a0a4]"
                                >
                                    {saving ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                            Saving…
                                        </span>
                                    ) : (
                                        "Save password"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setOpen(false)
                                        setPassword("")
                                        setError("")
                                    }}
                                    className="h-9 rounded-xl px-4 text-[13px] font-medium text-slate-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
