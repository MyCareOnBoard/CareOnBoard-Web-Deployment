import { useState } from "react"
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"


const slides = [
  {
    id: 1,
    type: "text-only",
    title: "Welcome to Care on Board",
    description:
      "We’re glad to have you join our team as a Direct Support Professional (DSP). You’ll play a crucial role in helping individuals with developmental disabilities live more independently.",
  },
  {
    id: 2,
    type: "image-list",
    title: "What You’ll Do",
    image: "/onboarding2.png",
    list: [
      "Assist with daily living activities",
      "Promote independence and community participation",
      "Ensure safety and well-being",
    ],
  },
  {
    id: 3,
    type: "image-checklist",
    title: "What You’ll Need",
    image: "/onboarding3.png",
    list: [
      "Compassion and patience",
      "Team collaboration",
      "Commitment to quality care",
    ],
  },
  {
    id: 4,
    type: "nested-slider",
    title: "Training Overview",
    nestedSlides: [
      {
        title: "Orientation",
        image: "/orientation.png",
        description: "Learn about our core values and mission.",
      },
      {
        title: "Safety Training",
        image: "/safety.png",
        description: "Understand safety procedures and reporting protocols.",
      },
      {
        title: "Hands-on Practice",
        image: "/practice.png",
        description: "Apply what you’ve learned in real scenarios.",
      },
    ],
  },
  {
    id: 5,
    type: "email-verification",
    title: "Verify Your Email",
  },
  {
    id: 6,
    type: "completion",
    title: "You’re All Set!",
    description: "Welcome aboard! Click below to go to your dashboard.",
  },
]

// COMPONENTS
const Logo = () => (
  <img src="/cab-logo-color.png" alt="Care on Board Logo" className="w-32 mb-4" />
)

// Nested slider for the 4th main slide
const NestedMiniSlider = ({ onNext }: { onNext: () => void }) => {
  const [nestedStep, setNestedStep] = useState(0)
  const nestedSlides = slides.find((s) => s.type === "nested-slider")?.nestedSlides || []

  const handleNext = () => {
    if (nestedStep < nestedSlides.length - 1) setNestedStep(nestedStep + 1)
    else onNext()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Logo />
      <h2 className="text-2xl font-bold">{nestedSlides[nestedStep].title}</h2>
      <img src={nestedSlides[nestedStep].image} alt={nestedSlides[nestedStep].title} className="w-64" />
      <p className="text-gray-600 text-center">{nestedSlides[nestedStep].description}</p>

      {/* Pagination dots */}
      <div className="flex gap-2 mt-2">
        {nestedSlides.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${
              i === nestedStep ? "bg-blue-600 w-4" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      <Button className="mt-4" onClick={handleNext}>
        {nestedStep < nestedSlides.length - 1 ? "Next" : "Continue"}
      </Button>
    </div>
  )
}

const EmailVerification = ({ onNext }: { onNext: () => void }) => {
  const [email, setEmail] = useState("")

  return (
    <div className="flex flex-col items-center gap-4">
      <Logo />
      <h2 className="text-2xl font-bold">Verify Your Email</h2>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border px-4 py-2 rounded-md w-72 text-center"
      />
      <Button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Verify
      </Button>
    </div>
  )
}

const CompletionScreen = ({ onComplete }: { onComplete: () => void }) => (
  <div className="flex flex-col items-center gap-4">
    <Logo />
    <CheckCircle className="w-12 h-12 text-green-500" />
    <h2 className="text-2xl font-bold">You’re All Set!</h2>
    <p className="text-gray-600 text-center w-72">
      Welcome aboard! You can now access your main dashboard.
    </p>
    <Button onClick={onComplete} className="bg-blue-600 text-white mt-4">
      Go to Dashboard
    </Button>
  </div>
)


// MAIN ONBOARDING SLIDER
export function OnboardingSlider({ onComplete }: { onComplete: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slide = slides[currentSlide]

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0))

  // Render slides dynamically
  const renderSlide = () => {
    switch (slide.type) {
      case "text-only":
        return (
          <div className="flex flex-col items-center text-center gap-4">
            <Logo />
            <h2 className="text-2xl font-bold">{slide.title}</h2>
            <p className="text-gray-600 max-w-md">{slide.description}</p>
          </div>
        )
      case "image-list":
        return (
          <div className="flex flex-col items-center text-center gap-4">
            <Logo />
            <img src={slide.image} alt={slide.title} className="w-64" />
            <h2 className="text-2xl font-bold">{slide.title}</h2>
            <ul className="list-disc text-gray-700 text-left w-72">
              {Array.isArray(slide.list) &&
                slide.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
            </ul>
          </div>
        )
      case "image-checklist":
        return (
          <div className="flex flex-col items-center text-center gap-4">
            <Logo />
            <img src={slide.image} alt={slide.title} className="w-64" />
            <ul className="text-left w-72 space-y-2">
              {Array.isArray(slide.list) &&
                slide.list.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" /> {item}
                  </li>
                ))}
            </ul>
          </div>
        )
      case "nested-slider":
        return <NestedMiniSlider onNext={nextSlide} />
      case "email-verification":
        return <EmailVerification onNext={nextSlide} />
      case "completion":
        return <CompletionScreen onComplete={onComplete} />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8">
        {renderSlide()}

        {/* Navigation controls (only if not nested or complete) */}
        {slide.type !== "nested-slider" && slide.type !== "completion" && (
          <div className="flex justify-between items-center mt-8">
            <Button
              onClick={prevSlide}
              variant="outline"
              disabled={currentSlide === 0}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={nextSlide}
              className="bg-blue-600 text-white rounded-full"
            >
              {currentSlide === slides.length - 2 ? "Finish" : "Next"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OnboardingSlider;