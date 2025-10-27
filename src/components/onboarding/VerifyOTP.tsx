import React, { useState } from 'react';
import LogoHeader from './LogoHeader';

interface VerifyOTPProps {
  onNext?: () => void;
  onBack?: () => void;
  email: string;
}

export default function VerifyOTP({ onNext, onBack, email }: VerifyOTPProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const verify = () => {
    if (otp !== '123456') { setError('Invalid OTP (try 123456)'); return; }
    setError('');
    onNext?.();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      <LogoHeader />
      <h3 className="text-xl font-semibold mb-2">Enter verification code</h3>
      <p className="text-gray-600 mb-4">A code was sent to <b>{email}</b></p>
      <input value={otp} onChange={(e)=>setOtp(e.target.value)} className="w-40 mx-auto border px-4 py-2 rounded-md text-center text-xl tracking-widest" placeholder="123456" />
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <div className="flex justify-center gap-4 mt-4">
        <button className="px-4 py-2 rounded-md border" onClick={onBack}>Back</button>
        <button className="px-4 py-2 rounded-md bg-[#00B6B3] text-white" onClick={verify}>Verify</button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Dummy OTP for testing: <b>123456</b></p>
    </div>
  );
}
