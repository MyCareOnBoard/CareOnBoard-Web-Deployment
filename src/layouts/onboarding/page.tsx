import { useNavigate } from "react-router"
import { useState } from "react"
import OnboardingSlider from "@/components/onboarding-slider";
import { EmailStep } from "@/components/email-step";
import { OtpStep } from "@/components/otp-step";

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<"onboarding" | "email" | "otp">("onboarding")
  const [email, setEmail] = useState("")

  // After onboarding slider is done
  const handleOnboardingComplete = () => setStep("email")

  // After email is verified
  const handleEmailVerified = (userEmail: string) => {
    setEmail(userEmail)
    setStep("otp")
  }

  // After OTP is verified
  const handleOtpVerified = () => {
    navigate("/dashboard")
  }

  return (
    <>
      {step === "onboarding" && (
        <OnboardingSlider onComplete={handleOnboardingComplete} />
      )}
      {step === "email" && (
        <EmailStep onNext={handleEmailVerified} />
      )}
      {step === "otp" && (
        <OtpStep onNext={handleOtpVerified} email={email} />
      )}
    </>
  )
}