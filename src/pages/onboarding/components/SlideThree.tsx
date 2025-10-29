import React from 'react'
import LogoHeader from './LogoHeader'
import { CheckSquare } from 'lucide-react'
export default function SlideThree() {
  const items = [
    'Be 18 years or older.',
    'Have a High School Diploma or GED.',
    'Pass a Criminal Background Check and Fingerprinting.',
    'Provide proof of work eligibility in the U.S.. ',
    'Complete mandatory DSP trainings (online & in-person). ',
    'Have reliable transportation to work sites.'
  ]
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <LogoHeader />
      <img src="/src/assets/onboarding_assets/minimum-req-img.png" alt="minimum-requirement" className="object-contain w-64 h-40 mb-4 rounded-md" />
      <h3 className="text-xl font-semibold">Applicants must:</h3>
      <div className="w-full max-w-md mt-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-[#00B4B8]" />
            <span className="text-[#808081]">{it}</span>
          </div>
        ))}
      </div>
      <p className="pt-3 font-bold text-[#808081] max-w-prose">This position requires reliability, patience, and a genuine commitment to helping others.</p>

    </div>
  )
}
