import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { signOut } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { useDispatch } from "react-redux"
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { auth } from "@/lib/firebase"
import axiosClient from "@/lib/axios"
import { Routes } from "@/routes/constants"
import { setUser } from "@/utils/auth/store/authSlice"
import { UserType } from "@/utils/auth/types/user.types"
import type { User } from "@/utils/auth/types/user.types"
import type { AppDispatch } from "@/store/redux/store"
import {
  createRecaptchaVerifier,
  clearRecaptchaVerifier,
} from "@/utils/auth/services/mfaService"
import {
  startPhoneSignIn,
  completePhoneSignIn,
} from "@/utils/auth/services/phoneAuthService"
import { RecaptchaAnchor } from "@/pages/auth/components/RecaptchaAnchor"
import OtpBoxInput from "./OtpBoxInput"
import type { ConfirmationResult } from "firebase/auth"

const RECAPTCHA_CONTAINER_ID = "recaptcha-family-login"
const RESEND_COOLDOWN_SEC = 60

type Phase = "enter-phone" | "enter-code"

export default function FamilyLoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>("enter-phone")
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

  useEffect(() => () => { if (resendTimerRef.current) clearInterval(resendTimerRef.current) }, [])

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationResult || otpCode.length < 6) return
    setVerifying(true)
    setInlineError("")
    try {
      await completePhoneSignIn(confirmationResult, otpCode)

      const response = await axiosClient.post<{ success: boolean; data: User }>(
        "/familyPortal/verify"
      )

      const user = response.data.data
      dispatch(setUser({ ...user, userType: UserType.FAMILY_MEMBER }))
      navigate(Routes.family.dashboard, { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string }
      const status = axiosErr.response?.status
      const serverMsg = axiosErr.response?.data?.message

      if (status === 404) {
        toast({
          title: "No portal access",
          description: serverMsg || "No Care-On-Board account found for this phone number. Contact your care agency.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sign-in failed",
          description: serverMsg || axiosErr.message || "Unable to sign in. Please try again.",
          variant: "destructive",
        })
      }

      await signOut(auth)
      clearRecaptchaVerifier()
      setOtpCode("")
      setConfirmationResult(null)
      setPhase("enter-phone")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="relative hidden w-[55%] flex-col overflow-hidden lg:flex"
        style={{ backgroundColor: "#0a3d3d" }}
      >
        {/* Vertical line pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 60px)",
          }}
        />

        <div className="relative z-10 flex flex-col px-14 pt-16">
          <h1 className="text-5xl font-bold leading-tight">
            <span style={{ color: "#00B4B8" }}>One Platform.</span>
            <br />
            <span className="text-white">Complete Care</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
            Simplify how care is managed, delivered, and experienced. CareOnboard unites staffing,
            coordination, billing, and compliance into one seamless, intelligent system so you can
            focus on what truly matters: people.
          </p>
        </div>

        {/* Overlapping photos */}
        <div className="relative z-10 mt-10 ml-10 flex-1">
          <img
            src="/assets/family-care-couple.jpg"
            alt="Family"
            className="absolute left-0 top-0 h-[300px] w-[260px] rounded-2xl object-cover shadow-2xl"
          />
          <img
            src="/assets/family-care-nurse.jpg"
            alt="Caregiver"
            className="absolute left-44 top-36 h-[260px] w-[220px] rounded-2xl object-cover shadow-2xl"
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f0f4f6] px-6 py-12">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-md">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#00B4B8" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21C12 21 3 15 3 9C3 6.23858 5.23858 4 8 4C9.65685 4 11.1696 4.7835 12 6C12.8304 4.7835 14.3431 4 16 4C18.7614 4 21 6.23858 21 9C21 15 12 21 12 21Z"
                  fill="white"
                />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-slate-800">Care on Board</span>
          </div>

          {/* Title */}
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">
            <span style={{ color: "#00B4B8" }}>Family care</span> sign in.
          </h2>

          <RecaptchaAnchor id={RECAPTCHA_CONTAINER_ID} />

          {/* Phase: enter phone */}
          {phase === "enter-phone" && (
            <form onSubmit={(e) => void handleContinue(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold text-slate-800">Phone Number</Label>
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

              <Button
                type="submit"
                disabled={sending}
                className="h-12 w-full rounded-full text-[15px] font-semibold text-white"
                style={{ backgroundColor: "#00B4B8" }}
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>

              <p className="text-center text-[13px]">
                <span
                  className="cursor-default font-medium"
                  style={{ color: "#00B4B8" }}
                >
                  Don&apos;t have an account? Contact our team for help
                </span>
              </p>
            </form>
          )}

          {/* Phase: enter OTP */}
          {phase === "enter-code" && (
            <form onSubmit={(e) => void handleSignIn(e)} className="space-y-5">
              <p className="text-[13px] font-semibold text-slate-700">
                Check your email/ phone number for the one time PIN
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
                style={{ backgroundColor: "#00B4B8" }}
              >
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
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
                style={{ color: "#00B4B8" }}
              >
                {resendSeconds > 0
                  ? `Resend code in ${String(Math.floor(resendSeconds / 60)).padStart(2, "0")}:${String(resendSeconds % 60).padStart(2, "0")}`
                  : "Resend code"}
              </button>
            </form>
          )}

          {/* Divider */}
          <hr className="my-6 border-slate-200" />

          {/* QR block */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              {/* Placeholder QR — replace with real QR asset when available */}
              <svg viewBox="0 0 100 100" className="h-full w-full text-slate-800" fill="currentColor">
                <rect x="10" y="10" width="35" height="35" rx="3" />
                <rect x="55" y="10" width="35" height="35" rx="3" />
                <rect x="10" y="55" width="35" height="35" rx="3" />
                <rect x="55" y="55" width="15" height="15" rx="2" fill="white" />
                <rect x="58" y="58" width="9" height="9" rx="1" />
                <rect x="75" y="55" width="15" height="15" rx="2" fill="white" />
                <rect x="78" y="58" width="9" height="9" rx="1" />
                <rect x="55" y="75" width="35" height="15" rx="2" fill="white" />
                <rect x="58" y="78" width="29" height="9" rx="1" />
                <rect x="17" y="17" width="21" height="21" rx="2" fill="white" />
                <rect x="62" y="17" width="21" height="21" rx="2" fill="white" />
                <rect x="17" y="62" width="21" height="21" rx="2" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Scan to download the app.</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                Scan the QR code to access care updates and real-time support on the go.
              </p>
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
          background: #f8fafc;
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
          font-size: 0.875rem;
          color: #1e293b;
          cursor: pointer;
        }
        .phone-input-family-login .PhoneInputInput {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.875rem;
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
