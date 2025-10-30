import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import LogoHeader from './components/LogoHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import VerifyOTP from './components/VerifyOTP';

export default function VerifyEmail(){
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  const send = () => {
    if (!email.includes('@')) { setError('Enter a valid email'); return }
    setError('')
    setTimeout(() => nav('/onboarding/otp'), 300)
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
          <h3 className="mb-2 text-2xl font-semibold">Congratulations! You have completed onboarding session.</h3>
          <p className="mb-4 font-bold text-gray-600 bg-bold">Now Verify your Email</p>
          <Input aria-label='Email Address' value={email} onChange={(e:any)=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full max-w-md py-2 text-center border rounded-xl" />
          {error && <div className="mt-2 text-red-500">{error}</div>}
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="default_full" className='flex max-w-md w-100' onClick={send}>Send OTP</Button>
          </div>
        </div>
        <div className="flex justify-center my-3">
          <Button variant="outline" onClick={() => nav(-1)}>Back</Button>
        </div>
      </div>
    </div>

  )
}
