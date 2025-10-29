import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoHeader from "./LogoHeader";

interface SuccessMessageProps {
  title: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export default function SuccessMessage({
  title = "Email Verified Successfully!",
  buttonText = "Continue to Dashboard",
  onButtonClick,
}: SuccessMessageProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

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

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
          className="flex justify-center mb-6"
        >
          <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
            {/* <MailCheck className="w-10 h-10 text-green-600" /> */}
              <img src="/src/assets/icons/email-verified-success-icon.svg" alt="Mail Verified Icon" className="mx-auto w-100 h-100" />
          </div>
        </motion.div>

        <h2 className="mb-2 text-2xl font-semibold text-gray-900">{title}</h2>
        <Button className="w-full" onClick={onButtonClick}>
          {buttonText}
        </Button>
      </motion.div>
    </div>
  );
}
