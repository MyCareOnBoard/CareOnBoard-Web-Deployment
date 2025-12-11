/**
 * Reset Password Page
 * 
 * Custom password reset page that handles Firebase password reset flow.
 * Users are directed here from the email reset link.
 * 
 * Features:
 * - Validates reset code from URL
 * - Shows user email being reset
 * - Password strength validation
 * - Confirms password with Firebase
 * - Redirects to login after success
 */

import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams, useNavigate, Link } from "react-router"
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ButtonLoader } from "@/components/ui/loader"
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { 
  getAuthErrorMessage, 
  getSuccessMessage,
  getValidationMessage,
} from "@/utils/auth/helpers/errorMessages"
import {Routes} from "@/routes/constants";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [email, setEmail] = useState<string>("")
  const [isValidCode, setIsValidCode] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
    confirmPassword?: string
  }>({})

  const oobCode = searchParams.get("oobCode")
  const mode = searchParams.get("mode")

  useEffect(() => {
    verifyResetCode()
  }, [oobCode])

  const verifyResetCode = async () => {
    if (!oobCode || mode !== "resetPassword") {
      toast.error("Invalid or missing reset link")
      setVerifying(false)
      return
    }

    try {
      // Verify the password reset code is valid
      const userEmail = await verifyPasswordResetCode(auth, oobCode)
      setEmail(userEmail)
      setIsValidCode(true)
      setVerifying(false)    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
      setVerifying(false)
      setIsValidCode(false)
    }
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) return getValidationMessage('password', 'required')
    if (value.length < 8) return getValidationMessage('password', 'tooShort')
    if (!/(?=.*[a-z])/.test(value)) return getValidationMessage('password', 'missingLowercase')
    if (!/(?=.*[A-Z])/.test(value)) return getValidationMessage('password', 'missingUppercase')
    if (!/(?=.*\d)/.test(value)) return getValidationMessage('password', 'missingNumber')
    return undefined
  }

  const getPasswordStrength = (value: string) => {
    if (!value) return { label: "", color: "", width: "0%" }
    
    let strength = 0
    if (value.length >= 8) strength++
    if (value.length >= 12) strength++
    if (/(?=.*[a-z])/.test(value)) strength++
    if (/(?=.*[A-Z])/.test(value)) strength++
    if (/(?=.*\d)/.test(value)) strength++
    if (/(?=.*[@$!%*?&#])/.test(value)) strength++

    if (strength <= 2) return { label: "Weak", color: "bg-red-500", width: "33%" }
    if (strength <= 4) return { label: "Medium", color: "bg-yellow-500", width: "66%" }
    return { label: "Strong", color: "bg-green-500", width: "100%" }
  }

  const passwordStrength = getPasswordStrength(password)

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    setErrors((prev) => ({ ...prev, password: undefined }))
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmPassword(value)
    setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
  }

  const handlePasswordBlur = () => {
    const error = validatePassword(password)
    setErrors((prev) => ({ ...prev, password: error }))
  }

  const handleConfirmPasswordBlur = () => {
    if (!confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: getValidationMessage('confirmPassword', 'required') }))
    } else if (password !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: getValidationMessage('confirmPassword', 'mismatch') }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const passwordError = validatePassword(password)
    const confirmError = !confirmPassword
      ? getValidationMessage('confirmPassword', 'required')
      : password !== confirmPassword
      ? getValidationMessage('confirmPassword', 'mismatch')
      : undefined

    if (passwordError || confirmError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmError,
      })
      toast.error(getValidationMessage('form', 'invalid'))
      return
    }

    if (!oobCode) {
      toast.error("Invalid reset code. Please request a new password reset link.")
      return
    }

    setLoading(true)

    try {
      // Confirm the password reset with the new password
      await confirmPasswordReset(auth, oobCode, password)
      
      const successMsg = getSuccessMessage('passwordResetComplete')
      toast.success(successMsg.description)

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate(Routes.auth.login)
      }, 2000)
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Verifying state
  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <ButtonLoader />
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Invalid code state
  if (!isValidCode) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-8">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to={Routes.auth.forgotPassword}>
              <Button className="w-full h-12 rounded-2xl bg-[#17a2b8] hover:bg-[#148a9c] mb-4">
                Request New Reset Link
              </Button>
            </Link>
            <Link
              to={Routes.auth.login}
              className="inline-block text-sm text-[#17a2b8] hover:text-[#148a9c] font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Valid code - show reset form
  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
          <p className="text-gray-600">
            Enter a new password for{" "}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-900">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                className={`h-12 rounded-2xl pr-12 ${
                  errors.password ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Password strength:</span>
                  <span
                    className={`font-medium ${
                      passwordStrength.label === "Weak"
                        ? "text-red-600"
                        : passwordStrength.label === "Medium"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
              </div>
            )}

            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}

            <div className="space-y-1">
              <p className="text-xs text-gray-500">Password must contain:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className="flex items-center gap-1.5">
                  {password.length >= 8 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                  At least 8 characters
                </li>
                <li className="flex items-center gap-1.5">
                  {/(?=.*[a-z])/.test(password) ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                  One lowercase letter
                </li>
                <li className="flex items-center gap-1.5">
                  {/(?=.*[A-Z])/.test(password) ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                  One uppercase letter
                </li>
                <li className="flex items-center gap-1.5">
                  {/(?=.*\d)/.test(password) ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                  One number
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onBlur={handleConfirmPasswordBlur}
                className={`h-12 rounded-2xl pr-12 ${
                  errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                }`}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
            {!errors.confirmPassword &&
              confirmPassword &&
              password === confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Passwords match
                </p>
              )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-2xl bg-[#17a2b8] hover:bg-[#148a9c] text-base font-semibold mt-6"
            disabled={loading || !!errors.password || !!errors.confirmPassword}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <ButtonLoader />
                Resetting Password...
              </span>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to={Routes.auth.login}
            className="text-sm text-[#17a2b8] hover:text-[#148a9c] font-medium"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
