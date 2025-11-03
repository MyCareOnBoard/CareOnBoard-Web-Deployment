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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/utils/auth"
import { useToast } from "@/hooks/use-toast"
import { ButtonLoader } from "@/components/ui/loader"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const { resetPassword } = useAuth()
  const { toast } = useToast()

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      return "Email is required"
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address"
    }
    return ""
  }

  // Real-time validation on blur
  const handleEmailBlur = () => {
    const emailError = validateEmail(email)
    setError(emailError)
  }

  // Clear errors on input
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) {
      setError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      toast({
        title: "Validation Error",
        description: emailError,
        variant: "destructive",
      })
      return
    }

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Forgot Password</h2>
        <p className="text-gray-500 text-sm">Please enter your email to receive a password reset link</p>
      </div>

      {/* Success State */}
      {sent ? (
        <div className="space-y-5">
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-sm text-green-800">
              Password reset instructions have been sent to your email address.
            </p>
          </div>
          <Link to="/login">
            <Button className="w-full h-12 bg-[#17a2b8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold transition-all">
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        /* Reset Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-900">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              required
              className={`h-12 rounded-2xl border-gray-200 bg-white text-base placeholder:text-gray-400 ${
                error ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !email || !!error}
            className="w-full h-12 bg-[#00B4B8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold mt-4 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-600 pt-2">
        Remember your password?{" "}
        <Link to="/login" className="text-[#17a2b8] hover:text-[#148a9c] font-semibold">
          Login
        </Link>
      </p>
    </div>
  )
}
