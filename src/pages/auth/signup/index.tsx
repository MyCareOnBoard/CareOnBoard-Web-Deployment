/** Sign up page for applicants invited by an agency (needs ?agencyId=). */

import type React from "react"
import {useEffect, useState} from "react"
import {useNavigate, Link, useLocation, Navigate} from "react-router"
import {Check, CircleX, Eye, EyeOff, LockKeyhole} from "lucide-react"
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
import {getAgencyInfo} from "@/lib/api/onboarding"
import type {ApplicantType} from "@/pages/applicant/application/documentConfig"
import {agencyCareReturnTo} from "@/utils/auth/helpers/agencyCareReturnTo"
import {PASSWORD_RULES} from "@/lib/passwordRules"
import {cn} from "@/lib/utils"
import {AuthStepHeader} from "@/pages/auth/components/AuthStepHeader"
import {authInputClass, authLabelClass, authLinkClass, authPrimaryButtonClass} from "@/pages/auth/components/authFormStyles"

const ERROR_TEXT = "text-[13px] text-[#d0202b]"
const STRENGTH = [
  {label: "Weak", bar: "bg-[#e5372b]"},
  {label: "Fair", bar: "bg-[#f0a52b]"},
  {label: "Strong", bar: "bg-[#20a35c]"},
]

/** Shown when the page can't be used: no invite link, or the agency didn't load. */
function InviteNotice({title, message}: { title: string; message: string }) {
  return (
    <div role="alert" className="relative mb-10 inline-flex max-w-full items-start gap-3 rounded-[12px] border border-[#e3e8ea] bg-white py-3 pl-3 pr-5 shadow-[0_8px_24px_rgba(208,32,43,0.08)] dark:border-white/10 dark:bg-[#1b232b]">
      <span className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#e5372b]/10 blur-3xl" aria-hidden="true"/>
      <CircleX className="relative mt-0.5 h-5 w-5 shrink-0 fill-[#d0202b] text-white" aria-hidden="true"/>
      <div className="relative min-w-0">
        <p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</p>
        <p className="text-[13px] text-[#34434c] dark:text-[#c9d3d6]">{message}</p>
      </div>
    </div>
  )
}

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

  const query = new URLSearchParams(useLocation().search)
  const returnTo = agencyCareReturnTo(query.get('returnTo'))
  const careInvitation = returnTo && /^\/agency-care\/invitations\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\/?(?:[?#]|$)/.test(returnTo)
  const agencyId = careInvitation ? null : query.get('agencyId');

  // Applicant type mirrors the agency's supported client types.
  // Default "dsp"; show a DSP/HHA selector only when the agency supports both.
  const [applicantType, setApplicantType] = useState<ApplicantType>("dsp")
  const [showApplicantTypeSelector, setShowApplicantTypeSelector] = useState(false)
  const [applicantOptions, setApplicantOptions] = useState<ApplicantType[]>(["dsp", "hha"])
  // Agency load state — signup is gated on a successfully loaded agency.
  const [agencyInfo, setAgencyInfo] = useState<any | null>(null)
  const [agencyLoading, setAgencyLoading] = useState<boolean>(Boolean(agencyId))

  const {signup} = useAuth()
  const navigate = useNavigate()
  const {toast} = useToast()

  // On mount, resolve the agency's supported client types to decide applicantType.
  useEffect(() => {
    if (!agencyId) {
      setAgencyLoading(false)
      setAgencyInfo(null)
      return
    }

    let cancelled = false
    setAgencyLoading(true)

    const resolveApplicantType = async () => {
      try {
        const info = await getAgencyInfo(agencyId)
        if (cancelled) return

        setAgencyInfo(info ?? null)
        if (!info) return

        const supported: string[] =
          info?.agency?.supportedClientTypes ?? info?.supportedClientTypes ?? []

        const options: ApplicantType[] = []
        if (supported.includes("ddd")) options.push("dsp")
        if (supported.includes("hha")) options.push("hha")
        if (supported.includes("sc")) options.push("support_coordinator")
        if (!options.length) options.push("dsp", "hha")
        setApplicantOptions(options)
        setShowApplicantTypeSelector(options.length > 1)
        const requested = new URLSearchParams(window.location.search).get("applicantType")
        setApplicantType(options.find((option) => option === requested) ?? options[0])
      } finally {
        if (!cancelled) setAgencyLoading(false)
      }
    }

    resolveApplicantType()

    return () => {
      cancelled = true
    }
  }, [agencyId])

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
    if (password.length < 8) {
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

    // Block signup until a valid agency has loaded.
    if (!agencyId || !agencyInfo) {
      toast({
        title: "Agency not loaded",
        description: "Please use a valid agency invite link to sign up.",
        variant: "destructive",
      })
      return
    }

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
      await signup(email, password, fullName, agencyId ?? undefined, applicantType)
      const successMsg = getSuccessMessage('signup')
      toast({
        title: successMsg.title,
        description: successMsg.description,
      })

      navigate(Routes.onboarding.index, { replace: true })
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

  // Signup is allowed only once a valid agency has loaded for the agencyId.
  const agencyReady = Boolean(agencyId) && !agencyLoading && !!agencyInfo
  const signupDisabled = loading || !agencyReady

  if (careInvitation) {
    const invitation = new URL(returnTo, 'https://care.local')
    invitation.searchParams.set('intent', 'register')
    return <Navigate to={`${invitation.pathname}${invitation.search}`} replace />
  }

  const rulesMet = PASSWORD_RULES.filter((rule) => rule.test(password)).length
  // 0-1 rules: weak (1 bar), 2-3: fair (2 bars), all 4: strong (3 bars).
  const strength = !password ? -1 : rulesMet === PASSWORD_RULES.length ? 2 : rulesMet >= 2 ? 1 : 0

  return (
    <div>
      {!agencyLoading && !agencyId && (
        <InviteNotice title="You need an invitation" message="An agency invite link is required to sign up."/>
      )}
      {!agencyLoading && agencyId && !agencyInfo && (
        <InviteNotice title="We couldn't load this agency" message="Check your invite link and try again."/>
      )}

      <div className="space-y-8">
      <AuthStepHeader title="Let's get you started." description="Create your account to stay connected and keep your care organized."/>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName" className={authLabelClass}>Full name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={handleFullNameChange}
            onBlur={handleFullNameBlur}
            required
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className={authInputClass}
          />
          {errors.fullName && <p id="fullName-error" className={ERROR_TEXT}>{errors.fullName}</p>}
        </div>

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
          {errors.email && <p id="email-error" className={ERROR_TEXT}>{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className={authLabelClass}>Password</Label>
            <div className="flex items-center gap-2 text-[13px] text-[#34434c] dark:text-[#c9d3d6]">
              Security level
              <span className="flex gap-1" aria-hidden="true">
                {STRENGTH.map((level, index) => (
                  <span key={level.label} className={cn("h-1 w-5 rounded-full transition-colors", strength >= index ? STRENGTH[strength].bar : "bg-[#e3e8ea] dark:bg-white/10")}/>
                ))}
              </span>
              <span className="sr-only" aria-live="polite">{strength >= 0 ? STRENGTH[strength].label : "Not set"}</span>
            </div>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a969c]" strokeWidth={1.8} aria-hidden="true"/>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error password-rules" : "password-rules"}
              className={`${authInputClass} pl-10 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#8a969c] hover:text-[#10141a] focus-visible:outline-2 focus-visible:outline-[#007679] dark:hover:text-[#f4f6f7]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8}/> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8}/>}
            </button>
          </div>
          {errors.password && <p id="password-error" className={ERROR_TEXT}>{errors.password}</p>}
          <ul id="password-rules" className="flex flex-wrap gap-2 pt-2" aria-label="Password rules">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password)
              return (
                <li key={rule.label} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
                  ok ? "border-[#bfe6cf] bg-[#e8f7ee] text-[#18804a] dark:border-[#20a35c]/40 dark:bg-[#20a35c]/15 dark:text-[#7fd6a3]"
                    : "border-[#e3e8ea] text-[#8a969c] dark:border-white/10 dark:text-[#9aa4a8]")}>
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", ok ? "border-current" : "border-[#c4ccd0] dark:border-white/20")} aria-hidden="true">
                    <Check className="h-2.5 w-2.5" strokeWidth={3}/>
                  </span>
                  {rule.label}<span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {showApplicantTypeSelector && (
          <fieldset className="space-y-2">
            <legend className={cn(authLabelClass, "mb-2")}>I am applying as</legend>
            <div className="grid grid-cols-2 gap-3">
              {applicantOptions.map((option) => <button key={option} type="button"
                onClick={() => setApplicantType(option)} aria-pressed={applicantType === option}
                className={cn("min-h-11 rounded-[10px] border px-4 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]",
                  applicantType === option ? "border-[#007679] bg-[#e3f6f6] text-[#00494a] dark:bg-[#007679]/20 dark:text-[#5fd0cd]" : "border-[#e3e8ea] bg-white text-[#34434c] hover:bg-[#f6f8f9] dark:border-white/10 dark:bg-[#1b232b] dark:text-[#c9d3d6]")}>
                {option === "support_coordinator" ? "Support Coordinator" : option === "hha" ? "Caregiver" : "DSP"}
              </button>)}
            </div>
          </fieldset>
        )}

        <Button type="submit" disabled={signupDisabled} className={authPrimaryButtonClass}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader/>
              Creating account...
            </span>
          ) : agencyLoading ? (
            <span className="flex items-center justify-center gap-2">
              <ButtonLoader/>
              Loading agency...
            </span>
          ) : (
            "Sign up"
          )}
        </Button>
      </form>

      <div className="space-y-3 text-center">
        <p className="text-[14px] text-[#34434c] dark:text-[#c9d3d6]">
          Already have an account?{" "}
          <Link to={Routes.auth.login + (agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : "")} className={authLinkClass}>
            Sign in here
          </Link>
        </p>
        <p className="text-[12px] leading-relaxed text-[#5d6b73] dark:text-[#9aa4a8]">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="font-medium text-[#10141a] underline dark:text-[#f4f6f7]">Terms of Service</Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-medium text-[#10141a] underline dark:text-[#f4f6f7]">Privacy Policy</Link>
        </p>
      </div>
      </div>
    </div>
  )
}
