import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import Confetti from "react-confetti"
import { MailCheck } from "lucide-react"
import { Button } from "../../../components/ui/button"
import LogoHeader from "./LogoHeader"

export default function EmailVerificationComplete() {
  const nav = useNavigate()
  const [showConfetti, setShowConfetti] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  // Handle responsive confetti
  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    updateSize()
    window.addEventListener("resize", updateSize)
    const timer = setTimeout(() => setShowConfetti(false), 4000)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", updateSize)
    }
  }, [])

  return (
    <div className="relative flex items-center justify-center min-h-screen p-6 overflow-hidden bg-gray-50">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.25}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-10 text-center bg-white shadow-xl rounded-3xl"
      >
        <LogoHeader />

        <span className="inline-block px-2 py-1 mb-4 text-xs font-medium text-green-600 rounded-md bg-green-50">
          Verification Complete
        </span>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
          className="flex justify-center mb-6"
        >
          <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
            <MailCheck className="w-10 h-10 text-green-600" />
          </div>
        </motion.div>

        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          Email Verification Successful 🎉
        </h2>
        <p className="mb-6 text-gray-600">
          Your email has been verified. You can now continue to your dashboard.
        </p>

        <Button className="w-full" onClick={() => nav("/dashboard")}>
          Continue to Dashboard
        </Button>
      </motion.div>
    </div>
  )
}
