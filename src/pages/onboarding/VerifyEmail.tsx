import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendOtp } from "@/lib/api/otp"
import { apiFetch } from "@/lib/api/otp"
import { getAuth } from "firebase/auth"
import LogoHeader from "./components/LogoHeader"

export default function VerifyEmail() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  // 🔹 Fetch or create user profile
  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      try {
        const auth = getAuth()
        await auth.authStateReady()
        const user = auth.currentUser

        if (!user?.email) {
          throw new Error("No authenticated user found")
        }

        setEmail(user.email)

        // Try to get existing profile from /users/profile
        let profile: any
        try {
          profile = await apiFetch("/users/profile")
          if (profile?.user) {
            console.log("✅ Profile found")
            
            // Check if onboarding is already completed
            if (profile.user.onboardingCompleted) {
              console.log("✅ Onboarding already completed, redirecting to dashboard")
              nav("/dashboard", { replace: true })
              return
            }
            
            // Check if email and OTP are both verified
            if (profile.user.emailVerified && profile.user.otpVerified) {
              console.log("✅ Email and OTP verified, redirecting to dashboard")
              nav("/dashboard", { replace: true })
              return
            }
            
            // Profile exists but verification not completed - continue
            return
          }
        } catch (e: any) {
          // If 404 or "user not found", create profile
          if (!/404|not found/i.test(e?.message || "")) {
            throw e // Re-throw non-404 errors
          }
        }

        // Create profile using /users/create endpoint
        console.log("Creating user profile...")
        await apiFetch("/users/create", {
          method: "POST",
          body: JSON.stringify({
            email: user.email,
            fullName: user.displayName || "User",
            uid: user.uid,
          }),
        })

        console.log("✅ Profile created successfully")
      } catch (err: any) {
        console.error("Profile error:", err)
        setError(err?.message || "Unable to initialize profile")
      } finally {
        setLoading(false)
      }
    }

    fetchOrCreateProfile()
  }, [nav])

  // 🔹 Send OTP using the helper function
  const sendOTP = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Email is required")
      return
    }

    setError("")
    setSending(true)

    try {
      await sendOtp(trimmedEmail)
      nav("/onboarding/otp", { state: { email: trimmedEmail } })
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to send OTP"
      
      // Check for index error
      if (/FAILED_PRECONDITION|requires an index/i.test(errorMsg)) {
        setError(
          "Database is being set up. Please wait 2-3 minutes and try again, or contact support."
        )
      } else if (/404|not found/i.test(errorMsg)) {
        setError("OTP service is currently unavailable. Please contact support.")
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
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-[#00B4B8] text-white">
            Email Verification
          </span>
        </div>

        <div className="min-h-[420px] flex flex-col items-center p-20 text-center bg-white shadow-2xl rounded-2xl gap-y-3">
          <LogoHeader />
          <h3 className="mb-2 text-2xl font-semibold">
            Congratulations! You have completed onboarding session.
          </h3>
          <p className="mb-4 font-medium text-gray-600">
            Now verify your email address to continue
          </p>

          {loading ? (
            <p className="text-gray-500">Initializing your profile...</p>
          ) : (
            <Input
              aria-label="Email Address"
              value={email}
              readOnly
              placeholder="you@example.com"
              className="max-w-md py-2 mx-auto text-center bg-gray-100 rounded-xl"
            />
          )}

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="default_full"
              onClick={sendOTP}
              disabled={sending || loading || !email}
              className="px-6 w-100 py-2 bg-[#00B4B8] text-white rounded-full"
            >
              {sending ? "Sending..." : "Send OTP"}
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
