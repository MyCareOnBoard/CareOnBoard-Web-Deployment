import React from 'react';
import LogoHeader from './LogoHeader';
import { useNavigate } from 'react-router';

export default function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      <LogoHeader />
      <div className="text-3xl mb-2">🎉</div>
      <h3 className="text-2xl font-semibold mb-2">You're all set!</h3>
      <p className="text-gray-600 mb-4">Welcome aboard — click below to go to your dashboard.</p>
      <button className="px-6 py-2 bg-[#00B6B3] text-white rounded-md" onClick={()=>navigate('/dashboard')}>Go to dashboard</button>
    </div>
  );
}
