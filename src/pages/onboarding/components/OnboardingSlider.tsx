import React, { useState } from "react";
import { useNavigate } from "react-router";
import SlideOne from "./SlideOne";
// import SlideTwo from "./SlideTwo";
import SlideThree from "./SlideThree";
import SlideFour from "./SlideFour";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/api/onboarding";
import { Routes } from "@/routes/constants";

export default function OnboardingSlider() {
  const navigate = useNavigate();
  const [innerComplete, setInnerComplete] = useState(false);
  const [idx, setIdx] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string>("");

  const slides = [
    { id: "s1", comp: <SlideOne />, badge: "Introduction to Agency & DDD" },
    // { id: "s2", comp: <SlideTwo />, badge: "Role Overview" },
    { id: "s3", comp: <SlideThree />, badge: "Minimum Requirements" },
    {
      id: "s4",
      comp: <SlideFour onInnerComplete={(done) => setInnerComplete(done)} />,
      badge: "How the Application Process Works",
    },
  ];

  const prev = () => setIdx((p) => Math.max(0, p - 1));

  const next = async () => {
    if (idx < slides.length - 1) {
      setIdx((p) => p + 1);
    } else {
      localStorage.setItem("onboarding_completed", "true");
      navigate(Routes.onboarding.email);
      // Mark onboarding as completed
      setCompleting(true);
      setError("");

      try {
        console.log("✅ [OnboardingSlider] Completing onboarding...");
        await completeOnboarding();
        console.log("✅ [OnboardingSlider] Onboarding completed successfully");

        // Redirect to email verification
        navigate(Routes.onboarding.email, { replace: true });
      } catch (error: any) {
        console.error("❌ [OnboardingSlider] Failed to complete onboarding:", error);

        // Since localStorage fallback was set, we can still proceed
        console.log("⚠️ [OnboardingSlider] Proceeding with localStorage fallback");
        navigate(Routes.onboarding.email, { replace: true });
      } finally {
        setCompleting(false);
      }
    }
  };

  const isLastSlide = idx === slides.length - 1;
  const isFinishDisabled = isLastSlide && !innerComplete;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
      <div className="w-full max-w-4xl px-4 mx-auto">
        <div className="flex justify-center my-3">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium inset-ring inset-ring-gray-400/20 ${
              slides[idx].badge ? "bg-[#00B4B8] text-white" : "hidden"
            }`}
          >
            {slides[idx].badge}
          </span>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-center text-red-600 border border-red-200 rounded-lg bg-red-50">
            {error}
          </div>
        )}

        <div className="p-8 bg-white shadow-2xl rounded-2xl">
          <div className="min-h-[420px] flex items-center justify-center">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={slides[idx].id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full"
              >
                {slides[idx].comp}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          {slides.map((s, i) => (
            <button
              key={s.id}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIdx(i)}
              disabled={completing}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "bg-[#00B4B8] w-8" : "bg-gray-300 w-2"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between max-w-4xl px-4 mx-auto mt-6">
          <button
            onClick={prev}
            disabled={idx === 0 || completing}
            className="flex items-center gap-2 text-sm text-gray-600 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Prev
          </button>

          <Button
            onClick={next}
            disabled={isFinishDisabled || completing}
            className="flex items-center gap-2"
          >
            {completing ? (
              <>
                <span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></span>
                Completing...
              </>
            ) : (
              <>
                {isLastSlide ? "Finish" : "Next"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
