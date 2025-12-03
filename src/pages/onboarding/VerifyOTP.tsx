import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { verifyOtp, resendOtp } from "@/lib/api/otp"
import { completeOnboarding } from "@/lib/api/onboarding"
import { getUserProfile } from "@/lib/api/users"
import { useAuth } from "@/utils/auth"
import LogoHeader from "./components/LogoHeader"
import { Routes } from "@/routes/constants"

export default function VerifyOTP() {
  const { user, loading: authLoading } = useAuth()
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { email?: string } }

  const [email, setEmail] = useState(state?.email || "")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(!state?.email)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEmail = async () => {
      // Wait for auth to be initialized
      if (authLoading) {
        return
      }

      try {
        if (email) {
          setLoading(false)
          return
        }

        // Try to get email from auth context user
        if (user?.email) {
          setEmail(user.email)
          setLoading(false)
          return
        }
        
        // Fallback to profile endpoint
        const profile = await getUserProfile()
        const profEmail = profile?.email
        if (!profEmail) throw new Error("User not found. Please create a profile first.")
        setEmail(profEmail)
      } catch (e: any) {
        setError(e.message || "Unable to fetch your email.")
      } finally {
        setLoading(false)
      }
    }
    loadEmail()
  }, [email, user, authLoading])

  const submit = async () => {
    const code = otp.trim()
    if (code.length < 4) return setError("Enter the OTP sent to your email")
    setError("")
    setVerifying(true)
    try {
      // Step 1: Verify OTP
      await verifyOtp(email, code)
      
      // Step 2: Update user profile to mark onboarding as completed
      try {
        await completeOnboarding()
        console.log("✅ Onboarding marked as completed")
      } catch (updateErr: any) {
        console.warn("⚠️ Could not update onboarding status:", updateErr)
        // Don't block navigation if update fails
      }

      nav(Routes.onboarding.success, { replace: true })
    } catch (e: any) {
      setError(e?.message || "Invalid or expired OTP")
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setError("")
    setResending(true)
    try {
      await resendOtp(email)
      setError("") // Clear any previous errors
      // Show success message
      alert("OTP resent successfully!")
    } catch (e: any) {
      setError(e?.message || "Failed to resend OTP")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center my-3">
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-[#00B4B8] text-white">
            OTP Verification
          </span>
        </div>

        <div className="min-h-[420px] flex flex-col items-center p-20 text-center bg-white shadow-2xl rounded-2xl gap-y-3">
          <LogoHeader />
          <h3 className="mb-2 text-2xl font-semibold">Enter the OTP sent to your email</h3>

          {authLoading || loading ? (
            <p className="text-gray-500">Fetching your email...</p>
          ) : (
            <>
              <Input value={email} readOnly className="max-w-md py-2 mx-auto text-center bg-gray-100 rounded-xl" />
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="max-w-md py-2 mx-auto text-center rounded-xl"
                maxLength={6}
              />
            </>
          )}

          {error && <p className="mt-2 text-red-500">{error}</p>}

          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="default_full"
              onClick={submit}
              disabled={verifying || authLoading || loading || !email || otp.length < 4}
              className="px-6 py-2 bg-[#00B4B8] text-white rounded-full"
            >
              {verifying ? "Verifying..." : "Verify OTP"}
            </Button>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resending || authLoading || loading || !email}
              className="px-6 py-2 rounded-full"
            >
              {resending ? "Resending..." : "Resend OTP"}
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
