import React, { useState, useEffect } from "react";
import LogoHeader from "./LogoHeader";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SlideFour({ onInnerComplete }: { onInnerComplete: (completed: boolean) => void }) {
  const mini = [
    { title: "This portal has five stages:", img: "/src/assets/onboarding_assets/stage-1.png", text: "Profile & Pre-Screening – Basic information & role fit." },
    { title: "This portal has five stages:", text: "Document Upload & Eligibility Verification – Proof of ID, education, and work eligibility.", img: "/src/assets/onboarding_assets/stage-2.png" },
    { title: "This portal has five stages:", text: "Conditional Hire & Compliance – Background check, fingerprinting, and initial trainings.", img: "/src/assets/onboarding_assets/stage-3.png" },
    { title: "This portal has five stages:", text: "Learn how to fill reports", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "This portal has five stages:", text: "Final Agency Review - HR review and DDD record creation", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "Have the following ready before starting:", text: "Valid photo ID (Driver’s License, State ID, or Passport).", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "Have the following ready before starting:", text: "Social Security Card or valid work permit.", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "Have the following ready before starting:", text: "High School Diploma / GED certificate.", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "Have the following ready before starting:", text: "Employment history and references.", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "Have the following ready before starting:", text: "Professional references (minimum 2).", img: "/src/assets/onboarding_assets/stage-4.png" },
    { title: "Have the following ready before starting:", text: "Resume (optional, but recommended).", img: "/src/assets/onboarding_assets/stage-4.png" },
  ];

  const [i, setI] = useState(0);

  const prev = () => setI((p) => Math.max(0, p - 1));
  const next = () => setI((p) => Math.min(mini.length - 1, p + 1));

  // 🧠 Notify parent when inner slider is complete
  useEffect(() => {
    onInnerComplete(i === mini.length - 1);
  }, [i, mini.length, onInnerComplete]);

  return (
    <div className="flex flex-col items-center px-6 text-center gap-y-2">
      <LogoHeader />
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <h4 className="text-lg font-semibold">{mini[i].title}</h4>
          <div className="bg-[#00B4B8] my-6 inline-flex p-5 rounded-4xl border-4 border-amber-50 shadow-2xl">
            <img src={mini[i].img} alt={mini[i].title} className="object-cover w-48 mx-auto mb-3 rounded-md h-36" />
          </div>
          <p className="text-center text-gray-600">{mini[i].text}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col items-center justify-center gap-4 mt-4">
        <div className="flex gap-2">
          {mini.map((_, idx) => (
            <span key={idx} className={`h-2 rounded-full ${idx === i ? "w-2 bg-[#00B4B8]" : "w-2 bg-[#00b5b865]"}`} />
          ))}
        </div>

        <div className="flex gap-x-4">
          <button
            onClick={prev}
            disabled={i === 0}
            className="flex items-center px-2 py-1 text-sm text-white bg-gray-600 rounded-full cursor-pointer disabled:opacity-40"
          >
            <ArrowLeft className="w-6 h-4" /> Prev
          </button>
          <button
            onClick={next}
            disabled={i === mini.length - 1}
            className="flex items-center bg-[#00B4B8] hover:bg-[#029a9c] active:bg-[#029a9c] text-white text-sm px-2 py-1 rounded-full cursor-pointer disabled:opacity-40"
          >
            Next <ArrowRight className="w-6 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
