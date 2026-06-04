import React from "react"
import { useState } from "react"
import { useNavigate, Link, useLocation } from "react-router"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/utils/auth"
import { useToast } from "@/hooks/use-toast"
import { ButtonLoader } from "@/components/ui/loader"
import { Routes } from "@/routes/constants"
import {
  getAuthErrorMessage,
  getValidationMessage
} from "@/utils/auth/helpers/errorMessages"
import { completePostLogin } from "@/utils/auth/helpers/postLogin"
import { useDispatch } from "react-redux"
import type { AppDispatch } from "@/store/redux/store"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const { login } = useAuth()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { toast } = useToast();

  const agencyId = new URLSearchParams(useLocation().search).get('agencyId');

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

  const validatePassword = (password: string) => {
    if (!password) {
      return getValidationMessage('password', 'required')
    }
    if (password.length < 6) {
      return getValidationMessage('password', 'tooShort')
    }
    return ""
  }

  const handleEmailBlur = () => {
    const emailError = validateEmail(email)
    setErrors(prev => ({ ...prev, email: emailError }))
  }

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(password)
    setErrors(prev => ({ ...prev, password: passwordError }))
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: "" }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({
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
      const result = await login(email, password)

      if (result.status === 'mfa_required') {
        navigate(Routes.auth.mfaChallenge, { replace: true })
        return
      }

      if (result.status === 'mfa_enrollment_required') {
        navigate(Routes.auth.mfaEnroll, { replace: true })
        return
      }

      await completePostLogin(dispatch, navigate, toast)
    } catch (error: unknown) {
      const errorMessage = getAuthErrorMessage(error)

      toast({
        title: "Unable to log in",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">Login to account</h2>
        <p className="text-sm sm:text-base text-slate-500">Please enter your information to access your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
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
            className={`h-12 rounded-2xl border-slate-200 bg-slate-50 text-base placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B4B8]/40 focus-visible:border-[#00B4B8] ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
          />
          {errors.email && (
            <p className="text-sm text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
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
              className={`h-12 rounded-2xl border-slate-200 bg-slate-50 text-base placeholder:text-slate-400 pr-12 focus-visible:ring-2 focus-visible:ring-[#00B4B8]/40 focus-visible:border-[#00B4B8] ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute text-slate-500 -translate-y-1/2 right-4 top-1/2 hover:text-slate-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">
              {errors.password}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="border-slate-300 rounded-md"
            />
            <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
              Remember me
            </label>
          </div>
          <Link to={Routes.auth.forgotPassword} className="text-sm text-[#00B4B8] hover:text-[#148a9c] font-semibold">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#00B4B8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold mt-4 transition-all shadow-[0_12px_24px_rgba(0,180,184,0.25)]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader />
              Logging in...
            </span>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      <p className="pt-2 text-sm text-center text-slate-600">
        Don't have an account?{" "}
        <Link
          to={Routes.auth.signup + (agencyId ? `?agencyId=${agencyId}` : "")}
          className="text-[#00B4B8] hover:text-[#148a9c] font-semibold"
        >
          Sign Up
        </Link>
      </p>
    </div>
  )
}
