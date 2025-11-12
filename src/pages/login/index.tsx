import type React from "react"
import { useState } from "react"
import { useNavigate, Link } from "react-router"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/utils/auth"
import { useToast } from "@/hooks/use-toast"
import { ButtonLoader } from "@/components/ui/loader"
import { Routes } from "@/routes/constants"
import { getUserProfile, getOnboardingStatus } from "@/lib/api/onboarding"
import { 
  getAuthErrorMessage, 
  getSuccessMessage,
  getValidationMessage 
} from "@/utils/auth/helpers/errorMessages"

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
  const { toast } = useToast()

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
    return ""
  }

  // Real-time validation on blur
  const handleEmailBlur = () => {
    const emailError = validateEmail(email)
    setErrors(prev => ({ ...prev, email: emailError }))
  }

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(password)
    setErrors(prev => ({ ...prev, password: passwordError }))
  }

  // Clear errors on input
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
    
    // Validate all fields
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
      console.log("🔐 Attempting login for:", email)
      
      // Login with Firebase
      await login(email, password)
      
      console.log("✅ Login successful, checking onboarding status...")
      
      // Check if user has completed onboarding
      const onboardingStatus = await getOnboardingStatus()
      console.log("📊 Onboarding status:", onboardingStatus)
      
      const successMsg = getSuccessMessage('login')
      toast({
        title: successMsg.title,
        description: successMsg.description,
      })

      const profile = await getUserProfile()
      // Check if onboarding is already completed
      if (profile.onboardingCompleted) {
        navigate(Routes.dashboard, { replace: true })
        return
      }
      navigate(Routes.onboarding)
    } catch (error: any) {
      console.error("❌ Login error:", error)
      
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Login to account</h2>
        <p className="text-sm text-gray-500">Please enter your information to access your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
              className={`h-12 rounded-2xl border-gray-200 bg-white text-base placeholder:text-gray-400 pr-12 ${
                errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute text-gray-600 -translate-y-1/2 right-4 top-1/2 hover:text-gray-900"
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
              className="border-gray-300 rounded-md"
            />
            <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
              Remember me
            </label>
          </div>
          <Link to="/forgot-password" className="text-sm text-[#17a2b8] hover:text-[#148a9c] font-medium">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#00B4B8] hover:bg-[#148a9c] text-white rounded-2xl text-base font-semibold mt-4 transition-all"
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

      <p className="pt-2 text-sm text-center text-gray-600">
        Don't have an account?{" "}
        <Link to="/signup" className="text-[#00B4B8] hover:text-[#148a9c] font-semibold">
          Sign Up
        </Link>
      </p>
    </div>
  )
}
