import React from 'react'
import LogoHeader from './LogoHeader'
export default function SlideTwo() {
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <LogoHeader />
      <img src="/src/assets/onboarding_assets/DSP-img.png" alt="minimum-requirement" className="object-contain py-2" />
      <h3 className="text-xl font-semibold">As a DSP, your responsibilities will include:</h3>
      <ul className="mt-4 space-y-2 text-left text-gray-700 list-disc list-inside">
        <li>Assisting individuals with daily living activities.</li>
        <li>Promoting independence and community participation.</li>
        <li>Ensuring health and safety.</li>
        <li>Following DDD and agency policies.</li>
      </ul>
      <p className="pt-3 font-bold text-[#808081] max-w-prose">This position requires reliability, patience, and a genuine commitment to helping others.</p>
    </div>
  )
}
