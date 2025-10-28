import type React from "react"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"

interface Quote {
  text: string
  author: string
}

const quotes: Quote[] = [
  {
    text: "To know even one life has breathed easier because you have lived — that is to have succeeded.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Behind every great hospital is a team that works together, cares deeply, and manages wisely.",
    author: "Unknown",
  },
  {
    text: "The best way to find yourself is to lose yourself in the service of others.",
    author: "Mahatma Gandhi",
  },
  {
    text: "Caring for others is an expression of what it means to be fully human.",
    author: "Hillary Clinton",
  },
]

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const [currentQuote, setCurrentQuote] = useState(0)

  // Auto-rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Teal branding section */}
      <div className="hidden lg:flex lg:w-[40%] m-4 rounded-md bg-linear-to-b from-[#02acaf] to-[#00B4B8] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url(/login-bg-main.jpg?height=1080&width=960&query=healthcare+professional+caring+smiling)",
            opacity: 0.3,
          }}
        />

        <div className="relative z-10 flex flex-col justify-around p-8 text-white w-full">
          {/* Logo and Welcome Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7" fill="white" />
              <span className="text-2xl font-semibold">Care on Board</span>
            </div>

            <div className=" my-6">
              <h1 className="text-[2.30rem] font-bold leading-tight py-4">Welcome to [Agency <br /> Name] Application <br /> Portal</h1>
              <p className="text-md text-white/95 leading-relaxed">
                Helping adults with developmental disabilities live full and meaningful lives.
              </p>
            </div>
          </div>

          <div className="bg-[#2B7A7C] rounded-lg p-4 mt-4 space-y-2">
            {/* Quote mark */}
            <div className="text-6xl font-serif leading-none">"</div>

            {/* Quote text */}
            <p className="text-lg leading-relaxed min-h-10">{quotes[currentQuote].text}</p>

            {/* Author badge */}
            <div className="inline-block px-5 py-1 border border-white/30 rounded-full">
              <span className="text-sm font-medium">{quotes[currentQuote].author}</span>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              {quotes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuote(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentQuote ? "bg-white w-8" : "bg-white/40 w-2"
                  }`}
                  aria-label={`Go to quote ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form area */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-[#f5f5f5]">
        <div className="w-full max-w-[480px]">{children}</div>
      </div>
    </div>
  )
}
