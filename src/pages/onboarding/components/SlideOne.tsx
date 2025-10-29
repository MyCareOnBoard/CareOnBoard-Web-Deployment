import React from 'react'
import LogoHeader from './LogoHeader'
export default function SlideOne() {
  return (
    <div className="flex flex-col items-center px-6 text-center gap-y-4 justify-evenly">
      <LogoHeader />
      <h2 className="mb-3 text-2xl font-bold text-gray-900">Thank you for your interest in joining our team as a Direct Support Professional (DSP).</h2>
      <p className="text-gray-600">We work under the New Jersey Division of Developmental Disabilities (DDD) to provide essential support to adults with developmental disabilities, helping them live independently, participate in their communities, and stay safe and healthy. </p>
      <p className="font-bold text-gray-600">The DDD requires all DSPs to meet strict hiring, training, and background standards — this portal will guide you through each step of the process.</p>
    </div>
  )
}
