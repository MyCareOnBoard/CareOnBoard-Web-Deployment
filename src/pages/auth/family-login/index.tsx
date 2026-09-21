import React, {useCallback, useEffect, useRef, useState} from "react"
import {useNavigate} from "react-router"
import {signOut} from "firebase/auth"
import {Loader2} from "lucide-react"
import {useDispatch} from "react-redux"
import PhoneInput, {isValidPhoneNumber} from "react-phone-number-input"
import "react-phone-number-input/style.css"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {useToast} from "@/hooks/use-toast"
import {auth} from "@/lib/firebase"
import axiosClient from "@/lib/axios"
import {Routes} from "@/routes/constants"
import {setUser} from "@/utils/auth/store/authSlice"
import {UserType} from "@/utils/auth/types/user.types"
import type {User} from "@/utils/auth/types/user.types"
import type {AppDispatch} from "@/store/redux/store"
import {
    createRecaptchaVerifier,
    clearRecaptchaVerifier,
} from "@/utils/auth/services/mfaService"
import {
    startPhoneSignIn,
    completePhoneSignIn,
} from "@/utils/auth/services/phoneAuthService"
import {
    sendFamilySignInLink,
    isFamilyEmailLink,
    completeEmailLinkSignIn,
    signInWithPassword,
    readPendingEmail,
} from "@/utils/auth/services/emailLinkService"
import {RecaptchaAnchor} from "@/pages/auth/components/RecaptchaAnchor"
import OtpBoxInput from "./OtpBoxInput"
import type {ConfirmationResult} from "firebase/auth"
import QRCode from "react-qr-code";

const RECAPTCHA_CONTAINER_ID = "recaptcha-family-login"
const RESEND_COOLDOWN_SEC = 60

/** How the family member proves who they are. Both reach the same /verify call. */
type Method = "phone" | "email"

/** Email members sign in by link; a password is offered to those who set one. */
type EmailMode = "link" | "password"

type Phase = "enter-phone" | "enter-code" | "enter-email" | "link-sent" | "completing-link"

/** mm:ss countdown, matching the wording the phone flow already uses. */
const RESEND_LINK_LABEL = (seconds: number) =>
    `Resend link in ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function FamilyLoginPage() {
    const navigate = useNavigate()
    const dispatch = useDispatch<AppDispatch>()
    const {toast} = useToast()

    const [method, setMethod] = useState<Method>("phone")
    const [emailMode, setEmailMode] = useState<EmailMode>("link")
    const [phase, setPhase] = useState<Phase>("enter-phone")
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState("")
    const [password, setPassword] = useState("")
    const [phone, setPhone] = useState("")
    const [phoneError, setPhoneError] = useState("")
    const [otpCode, setOtpCode] = useState("")
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
    const [sending, setSending] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [inlineError, setInlineError] = useState("")
    const [resendSeconds, setResendSeconds] = useState(0)
    const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const startResendCountdown = useCallback(() => {
        setResendSeconds(RESEND_COOLDOWN_SEC)
        if (resendTimerRef.current) clearInterval(resendTimerRef.current)
        resendTimerRef.current = setInterval(() => {
            setResendSeconds((s) => {
                if (s <= 1) {
                    clearInterval(resendTimerRef.current!)
                    return 0
                }
                return s - 1
            })
        }, 1000)
    }, [])

    useEffect(() => () => {
        if (resendTimerRef.current) clearInterval(resendTimerRef.current)
    }, [])

    const sendCode = useCallback(async (phoneE164: string) => {
        setSending(true)
        setInlineError("")
        try {
            const recaptcha = await createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID)
            const result = await startPhoneSignIn(phoneE164, recaptcha)
            setConfirmationResult(result)
            setPhase("enter-code")
            startResendCountdown()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to send verification code"
            setInlineError(msg)
            clearRecaptchaVerifier()
        } finally {
            setSending(false)
        }
    }, [startResendCountdown])

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!phone || !isValidPhoneNumber(phone)) {
            setPhoneError("Enter a valid phone number including country code")
            return
        }
        setPhoneError("")
        await sendCode(phone)
    }

    const handleResend = async () => {
        if (resendSeconds > 0 || sending) return
        clearRecaptchaVerifier()
        await sendCode(phone)
    }

    /**
     * Everything after Firebase has accepted the credential, shared by all three
     * routes in: the portal only trusts the server's answer about who this is.
     */
    const finishSignIn = useCallback(async (onFailure: () => void) => {
        try {
            const response = await axiosClient.post<{ success: boolean; data: User }>(
                "/familyPortal/verify"
            )

            const user = response.data.data
            dispatch(setUser({...user, userType: UserType.FAMILY_MEMBER}))
            navigate(Routes.family.dashboard, {replace: true})
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string }
            const status = axiosErr.response?.status
            const serverMsg = axiosErr.response?.data?.message

            if (status === 404 || status === 403) {
                toast({
                    title: status === 403 ? "Email not confirmed" : "No portal access",
                    description: serverMsg || "No Care-On-Board account found. Contact your care agency.",
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Sign-in failed",
                    description: serverMsg || axiosErr.message || "Unable to sign in. Please try again.",
                    variant: "destructive",
                })
            }

            // The Firebase session is real but useless without a matching contact
            // record, and leaving it signed in would strand the app in a state the
            // route guards read as "logged in".
            await signOut(auth)
            onFailure()
        }
    }, [dispatch, navigate, toast])

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!confirmationResult || otpCode.length < 6) return
        setVerifying(true)
        setInlineError("")
        try {
            await completePhoneSignIn(confirmationResult, otpCode)
            await finishSignIn(() => {
                clearRecaptchaVerifier()
                setOtpCode("")
                setConfirmationResult(null)
                setPhase("enter-phone")
            })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unable to sign in. Please try again."
            setInlineError(msg)
        } finally {
            setVerifying(false)
        }
    }

    const handleSendLink = async (e: React.FormEvent) => {
        e.preventDefault()
        const address = email.trim()
        if (!EMAIL_PATTERN.test(address)) {
            setEmailError("Enter a valid email address")
            return
        }
        setEmailError("")
        setInlineError("")
        setSending(true)
        try {
            await sendFamilySignInLink(address)
            setPhase("link-sent")
            startResendCountdown()
        } catch (err: unknown) {
            setInlineError(err instanceof Error ? err.message : "Failed to send the sign-in link")
        } finally {
            setSending(false)
        }
    }

    const handlePasswordSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        const address = email.trim()
        if (!EMAIL_PATTERN.test(address)) {
            setEmailError("Enter a valid email address")
            return
        }
        if (!password) {
            setInlineError("Enter your password")
            return
        }
        setEmailError("")
        setInlineError("")
        setVerifying(true)
        try {
            await signInWithPassword(address, password)
            await finishSignIn(() => {
                setPassword("")
                setPhase("enter-email")
            })
        } catch {
            // Firebase distinguishes "no such user" from "wrong password"; repeating
            // that back would confirm which addresses have portal accounts.
            setInlineError("That email address and password do not match.")
            setPassword("")
        } finally {
            setVerifying(false)
        }
    }

    /**
     * Returning from the inbox. The link carries a one-time code, not an identity,
     * so Firebase also needs the address it was sent to — stashed when it was
     * requested, or typed again here if that browser state is gone.
     */
    useEffect(() => {
        let cancelled = false

        const completeLink = async () => {
            if (!(await isFamilyEmailLink())) return
            if (cancelled) return

            const stored = readPendingEmail()
            const address = stored || window.prompt("Confirm the email address this link was sent to") || ""
            if (!EMAIL_PATTERN.test(address.trim())) {
                setMethod("email")
                setPhase("enter-email")
                setInlineError("We could not confirm which address this link was for. Please request a new one.")
                return
            }

            setMethod("email")
            setPhase("completing-link")
            setVerifying(true)
            try {
                await completeEmailLinkSignIn(address.trim())
                // Drop the one-time code from the address bar so a refresh does not
                // replay a link Firebase has already spent.
                window.history.replaceState({}, document.title, window.location.pathname)
                if (!cancelled) await finishSignIn(() => setPhase("enter-email"))
            } catch {
                if (!cancelled) {
                    setInlineError("That sign-in link has expired or has already been used. Request a new one.")
                    setPhase("enter-email")
                }
            } finally {
                if (!cancelled) setVerifying(false)
            }
        }

        void completeLink()
        return () => { cancelled = true }
    }, [finishSignIn])

    const switchMethod = (next: Method) => {
        setMethod(next)
        setPhase(next === "phone" ? "enter-phone" : "enter-email")
        setInlineError("")
        setEmailError("")
        setPhoneError("")
    }

    return (
        <div className="flex min-h-screen">
            {/* Left panel */}
            <div
                className="relative hidden w-[55%] flex-col lg:flex"
                style={{backgroundColor: "#0a3d3d"}}
            >
                {/* Vertical line pattern */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 60px)",
                    }}
                />

                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-16">
                    <div className="w-full max-w-2xl">
                        <p className="text-[52px] font-semibold leading-snug" style={{color: "#00B4B8"}}>
                            One Platform.
                        </p>
                        <h1 className="text-[52px] font-bold leading-tight text-white">
                            Complete Care
                        </h1>
                        <p className="mt-4 text-[16px] leading-relaxed text-white/65">
                            Simplify how care is managed, delivered, and experienced. CareOnboard unites staffing,
                            coordination, billing, and compliance into one seamless, intelligent system so you can
                            focus on what truly matters: people.
                        </p>

                        {/* Overlapping photos */}
                        <div className="relative mt-10" style={{height: "420px"}}>
                            <img
                                src="/assets/family-care-nurse.jpg"
                                alt="Caregiver"
                                className="absolute rounded-2xl object-cover shadow-2xl"
                                style={{left: "250px", top: "140px", width: "300px", height: "300px", zIndex: 1}}
                            />
                            <img
                                src="/assets/family-care-couple.jpg"
                                alt="Family"
                                className="absolute rounded-2xl object-cover shadow-2xl"
                                style={{left: 0, top: 0, width: "330px", height: "330px", zIndex: 2}}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-1 items-center justify-center px-16 py-12"
                 style={{background: "linear-gradient(120.49deg, #DBE8EB -90.37%, #EAEEEF 98.27%)"}}>
                <div
                    className="w-full rounded-2xl bg-white p-8"
                >
                    {/* Logo */}
                    <div className="mb-6 flex items-center gap-2">
                        <div className="w-[37px] h-[37px] flex items-center justify-center">
                            <img
                                src="/logo.svg"
                                alt="CareOnboard"
                                className="w-full h-full"
                            />
                        </div>
                        <span
                            className="text-[18px] font-semibold text-primary"
                            style={{color: "#00B4B8"}}
                        >
                CareOnboard
            </span>
                    </div>

                    {/* Title */}
                    <h2 className="mb-6 text-[26px] font-bold text-slate-900">
                        <span style={{color: "#00B4B8"}}>Family care</span> sign in.
                    </h2>

                    <RecaptchaAnchor id={RECAPTCHA_CONTAINER_ID}/>

                    {/* Method switcher — an agency records a phone, an email, or both */}
                    {(phase === "enter-phone" || phase === "enter-email") && (
                        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
                            {([["phone", "Phone"], ["email", "Email"]] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => switchMethod(value)}
                                    aria-pressed={method === value}
                                    className="h-10 rounded-full text-[14px] font-semibold transition-colors"
                                    style={
                                        method === value
                                            ? {backgroundColor: "#FFFFFF", color: "#00B4B8", boxShadow: "0 1px 2px rgba(0,0,0,0.08)"}
                                            : {color: "#64748b"}
                                    }
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Phase: enter phone */}
                    {method === "phone" && phase === "enter-phone" && (
                        <form onSubmit={(e) => void handleContinue(e)} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[15px] font-semibold text-slate-800">Phone Number</Label>
                                <PhoneInput
                                    international
                                    defaultCountry="US"
                                    value={phone || undefined}
                                    onChange={(value) => {
                                        setPhone(value ?? "")
                                        if (phoneError) setPhoneError("")
                                        if (inlineError) setInlineError("")
                                    }}
                                    className="phone-input-family-login"
                                    autoFocus
                                />
                                {phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
                                {inlineError && <p className="text-xs text-red-600">{inlineError}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[15px] font-semibold text-slate-800">Email Address</Label>
                                <Input
                                    type="email"
                                    placeholder="e.g. jane@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 rounded-xl border-slate-200 bg-white text-[16px] text-slate-800 placeholder:text-slate-400 focus-visible:border-[#00B4B8] focus-visible:ring-2 focus-visible:ring-[#00B4B8]/20"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={sending}
                                className="h-12 w-full rounded-full text-[15px] font-semibold text-white"
                                style={{backgroundColor: "#00B4B8"}}
                            >
                                {sending ? (
                                    <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Sending code…
                  </span>
                                ) : (
                                    "Continue"
                                )}
                            </Button>

                            <p className="text-center text-[13px]">
                <span
                    className="cursor-default font-medium"
                    style={{color: "#00B4B8"}}
                >
                  Don&apos;t have an account? Contact our team for help
                </span>
                            </p>
                        </form>
                    )}

                    {/* Phase: enter OTP */}
                    {method === "phone" && phase === "enter-code" && (
                        <form onSubmit={(e) => void handleSignIn(e)} className="space-y-5">
                            <p className="text-[15px] font-semibold text-slate-700">
                                Check your phone number for the one time PIN
                            </p>

                            <OtpBoxInput
                                value={otpCode}
                                onChange={setOtpCode}
                                disabled={verifying}
                                autoFocus
                            />

                            {inlineError && (
                                <p className="text-center text-xs text-red-600">{inlineError}</p>
                            )}

                            <Button
                                type="submit"
                                disabled={verifying || otpCode.length < 6}
                                className="h-12 w-full rounded-full text-[15px] font-semibold text-white"
                                style={{backgroundColor: "#00B4B8"}}
                            >
                                {verifying ? (
                                    <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Signing in…
                  </span>
                                ) : (
                                    "Sign in"
                                )}
                            </Button>

                            <button
                                type="button"
                                disabled={resendSeconds > 0 || sending}
                                onClick={() => void handleResend()}
                                className="block w-full text-center text-[13px] font-medium disabled:opacity-60"
                                style={{color: "#00B4B8"}}
                            >
                                {resendSeconds > 0
                                    ? `Resend code in ${String(Math.floor(resendSeconds / 60)).padStart(2, "0")}:${String(resendSeconds % 60).padStart(2, "0")}`
                                    : "Resend code"}
                            </button>
                        </form>
                    )}

                    {/* Phase: enter email — link by default, password for those who set one */}
                    {method === "email" && phase === "enter-email" && (
                        <form
                            onSubmit={(e) => void (emailMode === "link" ? handleSendLink(e) : handlePasswordSignIn(e))}
                            className="space-y-4"
                        >
                            <div className="space-y-1.5">
                                <Label className="text-[15px] font-semibold text-slate-800">Email Address</Label>
                                <Input
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        if (emailError) setEmailError("")
                                        if (inlineError) setInlineError("")
                                    }}
                                    className="h-12 rounded-xl border-slate-200 text-[15px]"
                                    autoFocus
                                />
                                {emailError && <p className="text-xs text-red-600">{emailError}</p>}
                            </div>

                            {emailMode === "password" && (
                                <div className="space-y-1.5">
                                    <Label className="text-[15px] font-semibold text-slate-800">Password</Label>
                                    <Input
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Your password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            if (inlineError) setInlineError("")
                                        }}
                                        className="h-12 rounded-xl border-slate-200 text-[15px]"
                                    />
                                </div>
                            )}

                            {inlineError && <p className="text-xs text-red-600">{inlineError}</p>}

                            <Button
                                type="submit"
                                disabled={sending || verifying}
                                className="h-12 w-full rounded-full text-[15px] font-semibold text-white"
                                style={{backgroundColor: "#00B4B8"}}
                            >
                                {sending || verifying ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                        {emailMode === "link" ? "Sending link…" : "Signing in…"}
                                    </span>
                                ) : (
                                    emailMode === "link" ? "Email me a sign-in link" : "Sign in"
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEmailMode(emailMode === "link" ? "password" : "link")
                                    setInlineError("")
                                    setPassword("")
                                }}
                                className="block w-full text-center text-[13px] font-medium"
                                style={{color: "#00B4B8"}}
                            >
                                {emailMode === "link"
                                    ? "I have a password"
                                    : "Email me a sign-in link instead"}
                            </button>
                        </form>
                    )}

                    {/* Phase: link sent */}
                    {method === "email" && phase === "link-sent" && (
                        <div className="space-y-5">
                            <p className="text-[15px] font-semibold text-slate-700">
                                Check your inbox
                            </p>
                            <p className="text-[14px] leading-relaxed text-slate-500">
                                We sent a sign-in link to <span className="font-medium text-slate-700">{email}</span>.
                                Open it on this device to finish signing in. It can take a minute to arrive,
                                and it may be in your spam folder.
                            </p>

                            {inlineError && <p className="text-xs text-red-600">{inlineError}</p>}

                            <button
                                type="button"
                                disabled={resendSeconds > 0 || sending}
                                onClick={(e) => void handleSendLink(e)}
                                className="block w-full text-center text-[13px] font-medium disabled:opacity-60"
                                style={{color: "#00B4B8"}}
                            >
                                {resendSeconds > 0
                                    ? RESEND_LINK_LABEL(resendSeconds)
                                    : "Resend link"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setPhase("enter-email")}
                                className="block w-full text-center text-[13px] font-medium text-slate-500"
                            >
                                Use a different email address
                            </button>
                        </div>
                    )}

                    {/* Phase: finishing a link sign-in */}
                    {phase === "completing-link" && (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <Loader2 className="h-6 w-6 animate-spin" style={{color: "#00B4B8"}}/>
                            <p className="text-[14px] text-slate-600">Signing you in…</p>
                        </div>
                    )}

                    {/* Divider */}
                    <hr className="my-6 border-slate-200"/>

                    {/* QR block */}
                    <div className="flex items-start gap-4">
                        <div style={{ height: "auto", margin: "0 auto", maxWidth: 70, width: "100%" }}>
                            <QRCode
                                size={300}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                value={"hy"}
                                viewBox={`0 0 300 300`}
                            />
                        </div>
                        <div className="flex flex-col items-center h-full">
                            <div>
                                <p className="text-[18px] font-semibold text-slate-800">Scan to download the app.</p>
                                <p className="mt-0.5 text-[16px] leading-relaxed text-slate-500">
                                    Scan the QR code to access care updates and real-time support on the go.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .phone-input-family-login {
          display: flex;
          align-items: center;
          height: 3rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          background: #ffffff;
          padding: 0 0.75rem;
          gap: 0.5rem;
        }
        .phone-input-family-login:focus-within {
          border-color: #00B4B8;
          box-shadow: 0 0 0 2px rgba(0, 180, 184, 0.2);
        }
        .phone-input-family-login .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #1e293b;
          cursor: pointer;
        }
        .phone-input-family-login .PhoneInputInput {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 1rem;
          color: #1e293b;
          min-width: 0;
        }
        .phone-input-family-login .PhoneInputInput::placeholder {
          color: #94a3b8;
        }
      `}</style>
        </div>
    )
}
