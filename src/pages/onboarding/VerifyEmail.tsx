import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendOtp } from "@/lib/api/otp"
import { checkUserStatus } from "@/lib/api/onboarding"
import { useAuth } from "@/utils/auth"
import LogoHeader from "./components/LogoHeader"
import { Routes } from "@/routes/constants"
import { auth } from "@/lib/firebase"
import { hasEnrolledMfa } from "@/utils/auth/services/mfaService"
import { ONBOARDING_EMAIL_COPY } from "./copy/onboardingEmailCopy"

export default function VerifyEmail() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  const copy = ONBOARDING_EMAIL_COPY

  useEffect(() => {
    const checkUser = async () => {
      if (authLoading) {
        return
      }

      try {
        if (!user?.email) {
          throw new Error(copy.errors.notSignedIn)
        }

        setEmail(user.email)

        const userData = await checkUserStatus()

        if (userData?.otpVerified) {
          await auth.authStateReady?.()
          const enrolled =
            auth.currentUser && (await hasEnrolledMfa(auth.currentUser))
          nav(
            enrolled ? Routes.applicant.dashboard : Routes.auth.mfaEnroll,
            { replace: true },
          )
          return
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : copy.errors.loadUserFailed
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [user, authLoading, nav, copy.errors])

  const handleSendVerificationCode = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError(copy.emailPage.emailRequired)
      return
    }

    setError("")
    setSending(true)

    try {
      await sendOtp(trimmedEmail)
      nav(Routes.onboarding.otp, { state: { email: trimmedEmail } })
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : copy.errors.sendFailed

      if (/FAILED_PRECONDITION|requires an index/i.test(errorMsg)) {
        setError(copy.errors.databaseSetup)
      } else if (/404|not found/i.test(errorMsg)) {
        setError(copy.errors.serviceUnavailable)
      } else if (/network/i.test(errorMsg)) {
        setError(copy.errors.network)
      } else if (/failed to send/i.test(errorMsg)) {
        setError(copy.errors.sendFailed)
      } else {
        setError(errorMsg)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center my-3">
          <span className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium bg-[#00B4B8] text-white shadow-sm">
            {copy.badge}
          </span>
        </div>

        <div className="min-h-[420px] flex flex-col items-center justify-center p-12 text-center bg-white shadow-2xl rounded-2xl gap-y-4">
          <LogoHeader />

          <h3 className="mb-2 text-2xl font-bold text-[#10141a]">
            {copy.emailPage.title}
          </h3>

          <p className="mb-4 text-base font-medium text-[#808081]">
            {copy.emailPage.description}
          </p>

          {authLoading || loading ? (
            <div className="flex items-center justify-center max-w-md py-3 mx-auto">
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full animate-spin border-t-[#00B4B8]"></div>
              <p className="ml-3 text-sm text-gray-500">
                {copy.emailPage.loadingAccount}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto">
              <label className="block mb-2 text-sm font-medium text-left text-gray-700">
                {copy.emailPage.emailLabel}
              </label>
              <Input
                aria-label="Email Address"
                value={email}
                readOnly
                placeholder="you@example.com"
                className="py-2.5 text-center bg-gray-50 border-gray-300 rounded-xl cursor-not-allowed text-gray-600"
                disabled
              />
            </div>
          )}

          {error && (
            <div
              className="w-full max-w-md p-3 mx-auto text-sm text-red-600 bg-red-50 rounded-xl"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={handleSendVerificationCode}
              disabled={sending || authLoading || loading || !email}
              className="px-8 py-2.5 bg-[#00B4B8] hover:bg-[#009da1] text-white rounded-full font-medium shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                  {copy.emailPage.sendingCode}
                </span>
              ) : (
                copy.emailPage.sendCode
              )}
            </Button>
          </div>
        </div>

        <div className="flex justify-center my-3">
          <Button
            variant="outline"
            onClick={() => nav(-1)}
            className="px-6 rounded-full"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
