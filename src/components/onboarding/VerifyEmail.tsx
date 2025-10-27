import React, { useState } from 'react';
import LogoHeader from './LogoHeader';

type VerifyEmailProps = {
  onNext?: (email: string) => void;
  onBack?: () => void;
};

export default function VerifyEmail({ onNext, onBack }: VerifyEmailProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  // simulate send OTP
  const send = () => {
    if (!email.includes('@')) { setError('Enter a valid email'); return; }
    setError('');
    onNext?.(email);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      <LogoHeader />
      <h3 className="text-xl font-semibold mb-2">Verify your email</h3>
      <p className="text-gray-600 mb-4">We will send a 6-digit code to your email.</p>
      <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full max-w-md mx-auto border px-4 py-2 rounded-md text-center" placeholder="you@example.com" />
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <div className="flex justify-center gap-4 mt-4">
        <button className="px-4 py-2 rounded-md border" onClick={onBack}>Back</button>
        <button className="px-4 py-2 rounded-md bg-[#00B6B3] text-white" onClick={send}>Send OTP</button>
      </div>
    </div>
  );
}
