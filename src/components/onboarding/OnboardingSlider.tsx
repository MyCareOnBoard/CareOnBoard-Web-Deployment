'use client';

import React, { useState } from 'react';
import SlideOne from './SlideOne';
import SlideTwo from './SlideTwo';
import SlideThree from './SlideThree';
import SlideFour from './SlideFour';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function OnboardingSlider({ onFinish }: { onFinish: () => void }) {
  const slides = [<SlideOne />, <SlideTwo />, <SlideThree />, <SlideFour />];
  const [index, setIndex] = useState(0);
  const prev = () => setIndex(i=>Math.max(0, i-1));
  const next = () => { if(index < slides.length-1) setIndex(i=>i+1); else onFinish(); };
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="min-h-[420px] flex items-center justify-center">{slides[index]}</div>
      <div className="flex justify-center items-center gap-3 mt-6">
        {slides.map((_,i)=>(<button key={i} onClick={()=>setIndex(i)} className={`h-2 rounded-full ${i===index?'bg-[#00B6B3] w-8':'bg-gray-300 w-2'}`}/>))}
      </div>
      <div className="flex justify-between items-center mt-6">
        <button onClick={prev} disabled={index===0} className="flex items-center gap-2 text-sm text-gray-600 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> Prev</button>
        <button onClick={next} className="flex items-center gap-2 bg-[#00B6B3] text-white px-4 py-2 rounded-full">{index===slides.length-1?'Finish':'Next'}<ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
