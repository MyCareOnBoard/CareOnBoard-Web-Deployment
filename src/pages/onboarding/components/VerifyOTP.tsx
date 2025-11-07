import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import LogoHeader from './LogoHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {Routes} from "@/routes/constants";

export default function VerifyOTP() {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const nav = useNavigate()

  const verify = () => {
    setLoading(true)
    setError('')
    setTimeout(() => {
      setLoading(false)
      if (otp === '123456') {
        nav(Routes.onboardingSuccess)
      } else {
        setError('Invalid OTP (try 123456)')
      }
    }, 800)
  }

  const resendOtp = () => {
    setResending(true)
    setMessage('')
    setTimeout(() => {
      setResending(false)
      setMessage('A new OTP has been sent to your email.')
    }, 1500)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center my-3">
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring inset-ring-gray-400/20 bg-[#00B4B8] text-white">
            Email Verification
          </span>
        </div>
        <div className="min-h-[420px] flex flex-col items-center p-20 text-center bg-white shadow-2xl rounded-2xl gap-y-2">
          <LogoHeader />
        <h3 className="mb-2 text-4xl font-semibold">
          Congratulations! You have completed onboarding session.
        </h3>
        <p className="mb-4 text-gray-600">
          Input your OTP sent to your mail
        </p>

        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full max-w-sm mx-auto text-xl tracking-widest text-center border rounded-xl"
          placeholder="Enter OTP"
          maxLength={6}
        />

        {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
        {message && <div className="mt-2 text-sm text-teal-600">{message}</div>}

        <div className="flex justify-center gap-4 mt-6">
          {/* <Button variant="outline" onClick={() => nav(-1)} disabled={loading}>
            Back
          </Button> */}
          <Button className="w-100" onClick={verify} disabled={loading}>
            {loading ? 'Verifying...' : 'Send OTP'}
          </Button>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Didn’t receive the email?{' '}
          <button
            onClick={resendOtp}
            disabled={resending}
            className="text-teal-600 hover:underline"
          >
            {resending ? 'Resending...' : 'Resend'}
          </button>
        </p>
      </div>
    </div>
  </div>
  )
}
