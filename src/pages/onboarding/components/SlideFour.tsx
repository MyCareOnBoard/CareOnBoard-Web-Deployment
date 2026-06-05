import React from 'react'
import LogoHeader from './LogoHeader'
export default function SlideFour() {
  return (
    <div className="flex flex-col items-center px-6 text-center gap-y-4 justify-evenly">
      <LogoHeader />
      <h4 className="text-xl font-semibold">This portal has five stages:</h4>
      <div className="bg-[#00B4B8] my-6 inline-flex p-5 rounded-4xl border-4 border-amber-50 shadow-2xl">
        <img src="/stage-1.png" alt="5 stages" className="object-contain w-64 h-40 mb-4 rounded-md" />
      </div>
      <p className="text-gray-600"> Profile & Pre-Screening – Basic information & role fit.</p>
    </div>
  )
}
