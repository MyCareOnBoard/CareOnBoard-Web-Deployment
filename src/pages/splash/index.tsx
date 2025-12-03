import { useEffect, useState } from "react"
import {useNavigate, useParams} from "react-router"
import { Routes } from "@/routes/constants"

export default function SplashScreen() {
  const navigate = useNavigate()
  const [isAnimating, setIsAnimating] = useState(true)

  const {id} = useParams<{id: string}>();
  console.log("id", id)

  useEffect(() => {
    // Navigate to login after animation completes
    const timer = setTimeout(() => {
      setIsAnimating(false)
      setTimeout(() => {
        navigate(Routes.auth.login + `?agencyId=${id}`)
      }, 600)
    }, 4000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-[#f5f7fa] transition-opacity duration-500 ${
        !isAnimating ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00B4B8] via-[#02acaf] to-[#00B4B8]" />

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00B4B8] via-[#02acaf] to-[#00B4B8]" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo and text container with scale animation */}
        <div className="flex flex-col items-center opacity-0 animate-fade-in-up">
          {/* Logo and text in horizontal layout */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Logo with subtle animations */}
            <div className="relative flex-shrink-0">
              {/* Glow effect behind logo */}
              <div
                className="absolute inset-0 blur-2xl bg-[#00B4B8]/20 rounded-full scale-150 animate-pulse-slow"
              />
              
              {/* Logo */}
              <div className="relative animate-float-gentle">
                <img
                  src="/logo.svg"
                  alt="Care on Board Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 animate-rotate-slow"
                />
              </div>
            </div>

            {/* Brand text */}
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#00B4B8] tracking-tight">
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.1s" }}>
                  C
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.15s" }}>
                  a
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.2s" }}>
                  r
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.25s" }}>
                  e
                </span>
                <span className="inline-block w-2 sm:w-3" />
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.3s" }}>
                  o
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.35s" }}>
                  n
                </span>
                <span className="inline-block w-2 sm:w-3" />
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.4s" }}>
                  B
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.45s" }}>
                  o
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.5s" }}>
                  a
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.55s" }}>
                  r
                </span>
                <span className="inline-block animate-letter-bounce" style={{ animationDelay: "0.6s" }}>
                  d
                </span>
              </h1>
            </div>
          </div>

          {/* Loading dots */}
          <div className="flex items-center justify-center gap-2 mt-12">
            <div
              className="w-2.5 h-2.5 bg-[#00B4B8] rounded-full animate-bounce"
              style={{ animationDelay: "0s", animationDuration: "1s" }}
            />
            <div
              className="w-2.5 h-2.5 bg-[#00B4B8] rounded-full animate-bounce"
              style={{ animationDelay: "0.2s", animationDuration: "1s" }}
            />
            <div
              className="w-2.5 h-2.5 bg-[#00B4B8] rounded-full animate-bounce"
              style={{ animationDelay: "0.4s", animationDuration: "1s" }}
            />
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes rotate-slow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1.5);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.7);
          }
        }

        @keyframes letter-bounce {
          0% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-15px);
          }
          50% {
            transform: translateY(0);
          }
          70% {
            transform: translateY(-7px);
          }
          100% {
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out 0.3s forwards;
        }

        .animate-float-gentle {
          animation: float-gentle 3s ease-in-out infinite;
        }

        .animate-rotate-slow {
          animation: rotate-slow 20s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-letter-bounce {
          animation: letter-bounce 1s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  )
}