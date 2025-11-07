import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from "react-router";
import { describe, it, vi, expect } from 'vitest';

// Safe framer-motion mock: strip non-DOM props to avoid React warnings/errors
vi.mock("framer-motion", async () => {
  const ReactActual = await vi.importActual<typeof import('react')>("react")
  const MotionDiv = (props: any) => {
    const { children, className, style, id, role } = props
    return ReactActual.createElement("div", { className, style, id, role }, children)
  }
  return {
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: { div: MotionDiv },
  }
})

// Make SlideFour report innerComplete=true immediately
const slideFourFactory = () => ({
  default: ({ onInnerComplete }: { onInnerComplete?: (v: boolean) => void }) => {
    React.useEffect(() => {
      onInnerComplete?.(true)
    }, [])
    return <div data-testid="mock-slide-four">Mocked SlideFour Inner Slider</div>
  }
})

// Use virtual mocks so tests don’t fail if a path doesn’t exist on disk
vi.mock("../components/SlideFour", slideFourFactory)
vi.mock("../components/slides/SlideFour", slideFourFactory)
vi.mock("@/pages/onboarding/components/SlideFour", slideFourFactory)

// Now import the OnboardingPage (after mocks)
import OnboardingPage from "../index"

describe("Onboarding flow (integration)", () => {
  it("renders onboarding slider, navigates slides and reaches email page", async () => {
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding/*" element={<OnboardingPage />} />
          <Route path="/onboarding/email" element={<div>VERIFY EMAIL PAGE</div>} />
        </Routes>
      </MemoryRouter>
    )

    const user = userEvent.setup()

    // Click Next 3 times, re-query each time to avoid stale DOM nodes
    await user.click(await screen.findByRole("button", { name: /next/i })) // -> slide 2
    await user.click(await screen.findByRole("button", { name: /next/i })) // -> slide 3
    await user.click(await screen.findByRole("button", { name: /next/i })) // -> slide 4 (innerComplete mocked)

    const finishBtn = await screen.findByRole("button", { name: /finish/i })
    expect(finishBtn).toBeTruthy()

    await user.click(finishBtn)

    expect(await screen.findByText(/VERIFY EMAIL PAGE/i)).toBeInTheDocument()
  }, 15000)
})
