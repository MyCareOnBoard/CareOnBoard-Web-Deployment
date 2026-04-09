/**
 * Sign Up Page
 *
 * Styled to match the exact design from the provided image.
 * Features:
 * - Full name, email, and password fields
 * - Password visibility toggle with eye icon
 * - Teal rounded sign up button
 * - Link to login page
 * - Terms of service and privacy policy agreement
 */

import type React from "react"
import {useState} from "react"
import {useNavigate, Link, useLocation} from "react-router"
import {Eye, EyeOff} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {useAuth} from "@/utils/auth"
import {useToast} from "@/hooks/use-toast"
import {ButtonLoader} from "@/components/ui/loader"
import {
  getAuthErrorMessage,
  getSuccessMessage,
  getValidationMessage
} from "@/utils/auth/helpers/errorMessages"
import {Routes} from "@/routes/constants";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    password?: string
  }>({});

  const agencyId = new URLSearchParams(useLocation().search).get('agencyId');

  const {signup} = useAuth()
  const navigate = useNavigate()
  const {toast} = useToast()

  // Validate full name
  const validateFullName = (name: string) => {
    if (!name) {
      return getValidationMessage('fullName', 'required')
    }
    if (name.trim().length < 2) {
      return getValidationMessage('fullName', 'tooShort')
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return getValidationMessage('fullName', 'invalid')
    }
    return ""
  }

  // Validate email format
  const validateEmail = (email: string) => {
    if (!email) {
      return getValidationMessage('email', 'required')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return getValidationMessage('email', 'invalid')
    }
    return ""
  }

  // Validate password
  const validatePassword = (password: string) => {
    if (!password) {
      return getValidationMessage('password', 'required')
    }
    if (password.length < 6) {
      return getValidationMessage('password', 'tooShort')
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return getValidationMessage('password', 'missingLowercase')
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return getValidationMessage('password', 'missingUppercase')
    }
    if (!/(?=.*\d)/.test(password)) {
      return getValidationMessage('password', 'missingNumber')
    }
    return ""
  }

  // Real-time validation on blur
  const handleFullNameBlur = () => {
    const nameError = validateFullName(fullName)
    setErrors(prev => ({...prev, fullName: nameError}))
  }

  const handleEmailBlur = () => {
    const emailError = validateEmail(email)
    setErrors(prev => ({...prev, email: emailError}))
  }

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(password)
    setErrors(prev => ({...prev, password: passwordError}))
  }

  // Clear errors on input
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)
    if (errors.fullName) {
      setErrors(prev => ({...prev, fullName: ""}))
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errors.email) {
      setErrors(prev => ({...prev, email: ""}))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (errors.password) {
      setErrors(prev => ({...prev, password: ""}))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const nameError = validateFullName(fullName)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (nameError || emailError || passwordError) {
      setErrors({
        fullName: nameError,
        email: emailError,
        password: passwordError,
      })
      toast({
        title: "Validation Error",
        description: getValidationMessage('form', 'invalid'),
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await signup(email, password, fullName, agencyId ?? undefined)
      const successMsg = getSuccessMessage('signup')
      toast({
        title: successMsg.title,
        description: successMsg.description,
      })
      navigate(Routes.onboarding.index)
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error)
      toast({
        title: "Unable to create account",
        description: errorMessage,
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
        <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
        <p className="text-gray-500 text-sm">
          Set up your access to manage users, data, and healthcare operations.
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-gray-900">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter full name"
            value={fullName}
            onChange={handleFullNameChange}
            onBlur={handleFullNameBlur}
            required
            className={`h-12 rounded-2xl border-gray-200 bg-white text-base placeholder:text-gray-400 ${
              errors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
          />
          {errors.fullName && (
            <p className="text-sm text-red-600">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-900">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            required
            className={`h-12 rounded-2xl border-gray-200 bg-white text-base placeholder:text-gray-400 ${
              errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
          />
          {errors.email && (
            <p className="text-sm text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field with Toggle */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-900">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              required
              minLength={6}
              className={`h-12 rounded-2xl border-gray-200 bg-white text-base placeholder:text-gray-400 pr-12 ${
                errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">
              {errors.password}
            </p>
          )}
          {/* Password strength indicator */}
          {password && !errors.password && (
            <div className="space-y-1">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
                      ? 'bg-green-500 w-full'
                      : password.length >= 6
                        ? 'bg-yellow-500 w-2/3'
                        : 'bg-red-500 w-1/3'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-500">
                Password strength: {
                password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
                  ? 'Strong'
                  : password.length >= 6
                    ? 'Medium'
                    : 'Weak'
              }
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#17a2b8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold mt-4 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader/>
              Creating account...
            </span>
          ) : (
            "Sign Up"
          )}
        </Button>
      </form>

      <div className="space-y-3 pt-2">
        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to={Routes.auth.login + (agencyId ? `?agencyId=${agencyId}` : "")} className="text-[#17a2b8] hover:text-[#148a9c] font-semibold">
            Login
          </Link>
        </p>
        <p className="text-center text-xs text-gray-500 leading-relaxed">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="text-gray-900 font-medium underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-gray-900 font-medium underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
