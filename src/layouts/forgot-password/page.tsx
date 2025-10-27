/**
 * Forgot Password Page
 *
 * Styled to match the exact design from the provided image.
 * Features:
 * - Email input field
 * - Gray "Send OTP" button (disabled state styling)
 * - Success confirmation
 * - Back to login link
 */

import type React from "react"
import { useState } from "react"
import { Link } from "react-router"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await resetPassword(email)
      setSent(true)
      toast({
        title: "Success",
        description: "Password reset email sent",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h2 className="text-[2rem] font-bold text-gray-900">Forgot Password</h2>
          <p className="text-gray-500 text-base">Please enter your OTP sent to car*****@gmail.com</p>
        </div>

        {/* Success State */}
        {sent ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-800">
                Password reset instructions have been sent to your email address.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full h-14 bg-[#17a2b8] hover:bg-[#148a9c] text-white rounded-full text-base font-semibold">
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          /* Reset Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Enter OTP
              </Label>
              <Input
                id="email"
                type="number"
                placeholder="Enter your OTP"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 rounded-xl border-gray-200 bg-white text-base placeholder:text-gray-400"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full h-14 bg-gray-400 hover:bg-[#00B4B8] text-white rounded-full text-base font-semibold mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Sent OTP"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link to="/login" className="text-[#17a2b8] hover:text-[#148a9c] font-semibold">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
