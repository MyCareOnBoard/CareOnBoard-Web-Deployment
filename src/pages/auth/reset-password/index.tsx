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
 * - Offers a safe continuation after success
 */

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, Link } from "react-router"
import { checkActionCode, verifyPasswordResetCode, confirmPasswordReset, type Auth } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ButtonLoader } from "@/components/ui/loader"
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { getAuthErrorMessage, getValidationMessage } from "@/utils/auth/helpers/errorMessages"
import { continuationPath, emailActionError, emailActionProblem, getEmailActionAuth } from "@/utils/auth/helpers/emailAction"
import {Routes} from "@/routes/constants";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.toString()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [email, setEmail] = useState<string>("")
  const [isValidCode, setIsValidCode] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState("")
  const [retryable, setRetryable] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [checkedQuery, setCheckedQuery] = useState<string | null>(null)
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
  const continuePath = continuationPath(searchParams.get("continueUrl"))
  const pending = useRef(false)
  const generation = useRef(0)
  const actionAuth = useRef<Auth | null>(null)

  useEffect(() => {
    const current = ++generation.current
    const params = new URLSearchParams(query)
    pending.current = false
    actionAuth.current = null
    setLoading(false)
    setVerifying(true)
    setIsValidCode(false)
    setComplete(false)
    setCheckedQuery(null)
    setError("")
    setRetryable(false)
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirmPassword(false)
    setErrors({})
    const problem = emailActionProblem(params) || (params.get('mode') !== 'resetPassword' ? 'This email action does not match a password reset.' : '')
    if (problem) {
      setError(problem)
      setVerifying(false)
    } else {
      void (async () => {
        try {
          const context = getEmailActionAuth(params)
          const code = params.get('oobCode')!
          // The installed SDK's reset-code verifier does not enforce the action operation.
          const info = await checkActionCode(context, code)
          if (generation.current !== current) return
          if (info.operation !== 'PASSWORD_RESET') {
            setError('This email action does not match a password reset.')
            return
          }
          const userEmail = await verifyPasswordResetCode(context, code)
          if (generation.current !== current) return
          actionAuth.current = context
          setEmail(userEmail)
          setCheckedQuery(query)
          setIsValidCode(true)
        } catch (cause) {
          if (generation.current !== current) return
          setError(emailActionError(cause))
          setRetryable((cause as { code?: string })?.code === 'auth/network-request-failed')
        } finally {
          if (generation.current === current) setVerifying(false)
        }
      })()
    }
    return () => { generation.current++ }
  }, [query, attempt])

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
    if (pending.current || complete || !isValidCode || checkedQuery !== query || !oobCode || mode !== 'resetPassword' || !actionAuth.current) return

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
      return
    }

    const current = generation.current
    pending.current = true
    setLoading(true)
    setError("")

    try {
      await confirmPasswordReset(actionAuth.current, oobCode, password)
      if (generation.current !== current) return
      setComplete(true)
      setPassword("")
      setConfirmPassword("")
    } catch (cause) {
      if (generation.current !== current) return
      const code = (cause as { code?: string })?.code
      if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') {
        setErrors({ password: getAuthErrorMessage({ code: 'auth/weak-password' }) })
      } else {
        setError(emailActionError(cause))
        if (code !== 'auth/network-request-failed' && code !== 'auth/too-many-requests') {
          setIsValidCode(false)
          setPassword("")
          setConfirmPassword("")
        }
      }
    } finally {
      if (generation.current === current) {
        pending.current = false
        setLoading(false)
      }
    }
  }

  // Verifying state
  if (verifying || (isValidCode && checkedQuery !== query)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <ButtonLoader />
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (complete) {
    return <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h1>
        <p className="text-gray-600 mb-8">Your password has been changed. You can now sign in with your new password.</p>
        <Button asChild className="w-full h-12 rounded-2xl bg-[#17a2b8] hover:bg-[#148a9c]"><Link to={continuePath}>Continue</Link></Button>
      </div>
    </div>
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
            <p role="alert" className="text-gray-600 mb-8">{error || 'This password reset link is invalid or has already been used. Please request a new one.'}</p>
            {retryable && <Button className="w-full mb-4" onClick={() => setAttempt(value => value + 1)}>Try again</Button>}
            <Button asChild className="w-full h-12 rounded-2xl bg-[#17a2b8] hover:bg-[#148a9c] mb-4">
              <Link to={Routes.auth.forgotPassword}>Request New Reset Link</Link>
            </Button>
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

        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-900">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
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
                aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                aria-pressed={showPassword}
                disabled={loading}
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

            {errors.password && <p id="password-error" role="alert" className="text-sm text-red-600">{errors.password}</p>}

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
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
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
                aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                aria-pressed={showConfirmPassword}
                disabled={loading}
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
              <p id="confirm-password-error" role="alert" className="text-sm text-red-600">{errors.confirmPassword}</p>
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
            aria-busy={loading}
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
