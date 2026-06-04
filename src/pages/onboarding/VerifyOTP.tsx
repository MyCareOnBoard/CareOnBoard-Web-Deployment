/**
 * Onboarding email OTP (Mailgun) — not Firebase SMS MFA.
 * SMS MFA enrollment happens after OTP at /auth/mfa-enroll.
 */
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { verifyOtp, resendOtp } from "@/lib/api/otp"
import { completeOnboarding } from "@/lib/api/onboarding"
import { getUser } from "@/lib/api/users"
import { useAuth } from "@/utils/auth"
import LogoHeader from "./components/LogoHeader"
import { Routes } from "@/routes/constants"
import { ONBOARDING_EMAIL_COPY } from "./copy/onboardingEmailCopy"

export default function VerifyOTP() {
  const { user, loading: authLoading } = useAuth()
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { email?: string } }
  const copy = ONBOARDING_EMAIL_COPY

  const [email, setEmail] = useState(state?.email || "")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(!state?.email)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [resendSuccess, setResendSuccess] = useState("")

  useEffect(() => {
    const loadEmail = async () => {
      if (authLoading) {
        return
      }

      try {
        if (email) {
          setLoading(false)
          return
        }

        if (user?.email) {
          setEmail(user.email)
          setLoading(false)
          return
        }

        const userData = await getUser()
        const userEmail = userData?.email
        if (!userEmail) {
          throw new Error(copy.otpPage.userNotFound)
        }
        setEmail(userEmail)
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : copy.otpPage.fetchEmailFailed
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    loadEmail()
  }, [email, user, authLoading, copy.otpPage])

  const submit = async () => {
    const code = otp.trim()
    if (code.length < 4) {
      setError(copy.otpPage.codeRequired)
      return
    }
    setError("")
    setResendSuccess("")
    setVerifying(true)
    try {
      await verifyOtp(email, code)

      try {
        await completeOnboarding()
      } catch (updateErr: unknown) {
        console.warn("Could not update onboarding status:", updateErr)
      }

      nav(Routes.onboarding.success, { replace: true })
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : copy.otpPage.invalidCode
      setError(
        /invalid|expired/i.test(message)
          ? copy.otpPage.invalidCode
          : message,
      )
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setError("")
    setResendSuccess("")
    setResending(true)
    try {
      await resendOtp(email)
      setResendSuccess(copy.otpPage.resendSuccess)
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : copy.otpPage.resendFailed
      setError(message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center my-3">
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-[#00B4B8] text-white">
            {copy.badge}
          </span>
        </div>

        <div className="min-h-[420px] flex flex-col items-center p-20 text-center bg-white shadow-2xl rounded-2xl gap-y-3">
          <LogoHeader />
          <h3 className="mb-2 text-2xl font-semibold">{copy.otpPage.title}</h3>
          <p className="text-sm text-gray-600">{copy.otpPage.subline}</p>

          {authLoading || loading ? (
            <p className="text-gray-500">{copy.otpPage.loadingEmail}</p>
          ) : (
            <>
              <Input
                value={email}
                readOnly
                className="max-w-md py-2 mx-auto text-center bg-gray-100 rounded-xl"
              />
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={copy.otpPage.codePlaceholder}
                className="max-w-md py-2 mx-auto text-center rounded-xl"
                maxLength={6}
              />
            </>
          )}

          {resendSuccess && (
            <p
              className="mt-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2 max-w-md"
              role="status"
            >
              {resendSuccess}
            </p>
          )}

          {error && (
            <p className="mt-2 text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="default_full"
              onClick={submit}
              disabled={
                verifying || authLoading || loading || !email || otp.length < 4
              }
              className="px-6 py-2 bg-[#00B4B8] text-white rounded-full"
            >
              {verifying ? copy.otpPage.verifying : copy.otpPage.confirmCode}
            </Button>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resending || authLoading || loading || !email}
              className="px-6 py-2 rounded-full"
            >
              {resending ? copy.otpPage.resending : copy.otpPage.resend}
            </Button>
          </div>
        </div>

        <div className="flex justify-center my-3">
          <Button variant="outline" onClick={() => nav(-1)}>
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
