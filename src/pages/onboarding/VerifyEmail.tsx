import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendOtp } from "@/lib/api/otp"
import { checkUserStatus } from "@/lib/api/onboarding"
import { useAuth } from "@/utils/auth"
import LogoHeader from "./components/LogoHeader"
import { Routes } from "@/routes/constants"

export default function VerifyEmail() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  // 🔹 Check profile status and auto-extract email
  useEffect(() => {
    const checkUser = async () => {
      // Wait for auth to be initialized
      if (authLoading) {
        return
      }

      try {
        if (!user?.email) {
          throw new Error("No authenticated user found")
        }

        // Auto-populate email from authenticated user
        setEmail(user.email)

        // Check if user data exists
        const userData = await checkUserStatus()
        
        if (userData) {
          // Only redirect if BOTH onboarding is completed AND OTP is verified
          if (userData.onboardingCompleted && userData.otpVerified) {
            nav(Routes.applicant.dashboard, { replace: true })
            return
          }
          
          // If only OTP is verified but onboarding not completed, stay on this page
          // If neither is verified, stay on this page to verify OTP
        } else {
          // User data doesn't exist yet - user must complete OTP verification first
          // Don't redirect, stay on this page
        }
      } catch (err: any) {
        // Don't redirect on error - user needs to complete OTP verification
        setError(err?.message || "Unable to load user data")
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [user, authLoading, nav])

  // 🔹 Send OTP and navigate to OTP verification
  const handleVerifyOTP = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Email is required")
      return
    }

    setError("")
    setSending(true)

    try {
      await sendOtp(trimmedEmail)
      
      // Navigate to OTP verification page
      nav(Routes.onboarding.otp, { state: { email: trimmedEmail } })
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to send OTP"
      
      // Check for specific error types
      if (/FAILED_PRECONDITION|requires an index/i.test(errorMsg)) {
        setError(
          "Database is being set up. Please wait 2-3 minutes and try again, or contact support."
        )
      } else if (/404|not found/i.test(errorMsg)) {
        setError("OTP service is currently unavailable. Please contact support.")
      } else if (/network/i.test(errorMsg)) {
        setError("Network error. Please check your connection and try again.")
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
        {/* Progress Badge */}
        <div className="flex justify-center my-3">
          <span className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium bg-[#00B4B8] text-white shadow-sm">
            OTP Verification
          </span>
        </div>

        {/* Main Card */}
        <div className="min-h-[420px] flex flex-col items-center justify-center p-12 text-center bg-white shadow-2xl rounded-2xl gap-y-4">
          <LogoHeader />
          
          <h3 className="mb-2 text-2xl font-bold text-[#10141a]">
            Congratulations! You have completed onboarding session.
          </h3>
          
          <p className="mb-4 text-base font-medium text-[#808081]">
            Email already verified. Now verify your phone number with OTP.
          </p>

          {/* Email Display (Read-only) */}
          {authLoading || loading ? (
            <div className="flex items-center justify-center max-w-md py-3 mx-auto">
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full animate-spin border-t-[#00B4B8]"></div>
              <p className="ml-3 text-sm text-gray-500">Initializing your profile...</p>
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto">
              <label className="block mb-2 text-sm font-medium text-left text-gray-700">
                Verified Email Address
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

          {/* Error Message */}
          {error && (
            <div className="w-full max-w-md p-3 mx-auto text-sm text-red-600 bg-red-50 rounded-xl" role="alert">
              {error}
            </div>
          )}

          {/* Verify OTP Button */}
          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={handleVerifyOTP}
              disabled={sending || authLoading || loading || !email}
              className="px-8 py-2.5 bg-[#00B4B8] hover:bg-[#009da1] text-white rounded-full font-medium shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                  Sending OTP...
                </span>
              ) : (
                "Verify OTP"
              )}
            </Button>
          </div>
        </div>

        {/* Back Button */}
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
