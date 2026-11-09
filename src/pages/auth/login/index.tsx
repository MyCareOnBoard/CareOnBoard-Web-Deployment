import React from "react"
import { useState } from "react"
import { useNavigate, Link, useLocation } from "react-router"
import { Eye, EyeOff, LockKeyhole } from "lucide-react"
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
import { agencyCareInvitationReturnTo, agencyCareReturnTo, authRouteWithReturnTo } from "@/utils/auth/helpers/agencyCareReturnTo"
import { useDispatch } from "react-redux"
import { AuthStepHeader } from "@/pages/auth/components/AuthStepHeader"
import { authInputClass, authLabelClass, authLinkClass, authPrimaryButtonClass } from "@/pages/auth/components/authFormStyles"
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

  const query = new URLSearchParams(useLocation().search)
  const agencyId = query.get('agencyId')
  const returnTo = agencyCareReturnTo(query.get('returnTo'))

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

      if (result.status === 'profile_required') {
        const invitation = agencyCareInvitationReturnTo(returnTo)
        if (invitation) {
          const destination = new URL(invitation, window.location.origin)
          destination.searchParams.set('intent', 'register')
          navigate(`${destination.pathname}${destination.search}${destination.hash}`, { replace: true })
        } else {
          toast({
            title: "Unable to log in",
            description: "Your account setup is incomplete. Reopen your Agency Care invitation to finish registration, or contact your administrator.",
            variant: "destructive",
          })
        }
        return
      }

      if (result.status === 'mfa_required') {
        navigate(authRouteWithReturnTo(Routes.auth.mfaChallenge, returnTo), { replace: true })
        return
      }

      if (result.status === 'mfa_enrollment_required') {
        navigate(authRouteWithReturnTo(Routes.auth.mfaEnroll, returnTo), { replace: true })
        return
      }

      await completePostLogin(dispatch, navigate, toast, returnTo)
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

  const signupHref = returnTo ? authRouteWithReturnTo(Routes.auth.signup, returnTo) : Routes.auth.signup + (agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : "")

  return (
    <div className="space-y-8">
      <AuthStepHeader title="Welcome back." description="Sign in to pick up where you left off." />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className={authLabelClass}>Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email here"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={authInputClass}
          />
          {errors.email && <p id="email-error" className="text-[13px] text-[#d0202b]">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClass}>Password</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a969c]" strokeWidth={1.8} aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`${authInputClass} pl-10 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#8a969c] hover:text-[#10141a] focus-visible:outline-2 focus-visible:outline-[#007679] dark:hover:text-[#f4f6f7]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="text-[13px] text-[#d0202b]">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            label="Remember me"
            className="size-[18px] rounded-[5px] border-[#007679] peer-checked:border-[#007679] peer-checked:bg-[#007679] dark:bg-transparent"
            labelClassName="ml-1.5 text-[14px] font-normal text-[#34434c] dark:text-[#c9d3d6]"
          />
          <Link to={Routes.auth.forgotPassword} className={`text-[14px] ${authLinkClass}`}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="space-y-2 text-center text-[14px] text-[#34434c] dark:text-[#c9d3d6]">
        <p>
          Don't have an account?{" "}
          <Link to={signupHref} className={authLinkClass}>Sign up here</Link>
        </p>
        <p>
          Family member?{" "}
          <Link to={Routes.auth.familyLogin} className={authLinkClass}>Sign in with phone</Link>
        </p>
      </div>
    </div>
  )
}
