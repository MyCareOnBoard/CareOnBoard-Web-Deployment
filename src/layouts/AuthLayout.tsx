import {Outlet, useLocation} from "react-router";

import React, {useLayoutEffect} from "react"
import {useState, useEffect} from "react"
import {getAgencyInfo} from "@/lib/api/onboarding";

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

export default function AuthLayout() {
  const [currentQuote, setCurrentQuote] = useState(0);

  const [agency, setAgency] = useState<string>("");

  const agencyId = new URLSearchParams(useLocation().search).get('agencyId');

  const fetchAgencyInfo = async () => {
    const agency = await getAgencyInfo(agencyId as string);
    if (agency) {
      setAgency(agency?.agency?.name)
    }
  }

  useLayoutEffect(() => {
    if (agencyId && agencyId !== "undefined") {
      fetchAgencyInfo();
    }
  }, []);

  // Auto-rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-between p-[30px] min-h-screen bg-white">
      {/* Left Banner - Teal branding section */}
      <div
        className="hidden lg:flex bg-[#00b4b8] flex-col h-[calc(100vh-60px)] justify-between p-[60px] rounded-[8px] w-[528px] relative overflow-hidden"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 overflow-hidden opacity-40">
            <img
              alt=""
              className="absolute h-full left-[-14.67%] max-w-none top-[-8.3%] w-[121.76%] object-cover"
              src="/login-bg-main.jpg"
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 180, 184, 0) 18.309%, #00b4b8 88.547%, #00b4b8 113.69%)'
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Logo */}
          <div className="flex gap-[11.563px] items-center">
            <div className="w-[37px] h-[37px] flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="Care on Board"
                className="w-full h-full"
              />
            </div>
            <p className="font-bold text-[27.75px] text-white tracking-[0.2775px]"
               style={{fontFamily: 'Urbanist, sans-serif'}}>
              Care on Board
            </p>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-[24px] w-full">
            <h1
              className="font-bold text-[40px] leading-[1.4] text-white w-full"
              style={{fontFamily: 'Urbanist, sans-serif'}}
            >
              Welcome to {agency ? agency : "Care On Board"} Application Portal
            </h1>
            <p
              className="font-normal text-[20px] leading-[1.6] text-[#f3f6f7] w-full"
              style={{fontFamily: 'Urbanist, sans-serif'}}
            >
              Helping adults with developmental disabilities live full and meaningful lives.
            </p>
          </div>

          {/* Quotes Section */}
          <div className="flex flex-col gap-[24px] items-center w-full">
            <div className="bg-[#2b7a7c] flex flex-col gap-[20px] p-[16px] rounded-[6px] w-full">
              <div className="flex flex-col gap-[14px] w-full">
                {/* Quote Mark */}
                <div className="h-[17px] w-[20px]">
                  <svg width="20" height="17" viewBox="0 0 20 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M0 16.5V8.5C0 3.8 2.4 0 8 0V3C5.2 3 3.6 4.6 3.2 7.5C3.8 7.3 4.4 7.2 5 7.2C7.2 7.2 9 9 9 11.2V16.5H0ZM11 16.5V8.5C11 3.8 13.4 0 19 0V3C16.2 3 14.6 4.6 14.2 7.5C14.8 7.3 15.4 7.2 16 7.2C18.2 7.2 20 9 20 11.2V16.5H11Z"
                      fill="white"/>
                  </svg>
                </div>
                {/* Quote Text */}
                <p
                  className="font-semibold text-[20px] leading-[1.6] text-white"
                  style={{fontFamily: 'Urbanist, sans-serif'}}
                >
                  {quotes[currentQuote].text}
                </p>
              </div>
              {/* Author Badge */}
              <div
                className="inline-flex bg-[rgba(213,230,255,0.1)] border border-[#e5effa] items-center justify-center px-[18px] py-[8px] rounded-[99px] self-start">
                <p
                  className="font-medium text-[14px] leading-[1.4] text-white"
                  style={{fontFamily: 'Urbanist, sans-serif'}}
                >
                  {quotes[currentQuote].author}
                </p>
              </div>
            </div>

            {/* Indicator Dots */}
            <div className="flex gap-2 h-[8px] w-[50px] justify-center items-center">
              {quotes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuote(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentQuote ? "bg-white w-8" : "bg-white/30 w-2"
                  }`}
                  aria-label={`Go to quote ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Content - Form area */}
      <div className="flex flex-1 flex-col gap-[10px] h-[calc(100vh-60px)] items-center justify-center min-w-0">
        <div className="flex flex-col gap-[48px] items-start justify-center rounded-[16px] w-full max-w-[496px]">
          <Outlet/>
        </div>
      </div>
    </div>
  )
}

