import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, it, beforeEach, expect, vi } from "vitest"

vi.mock("framer-motion", async () => {
  const ReactActual = await vi.importActual<typeof import("react")>("react")
  const MotionDiv = ({ children, ...safeProps }: any) =>
    ReactActual.createElement("div", safeProps, children)

  return {
    AnimatePresence: ({ children }: any) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    motion: {
      div: MotionDiv,
    },
  }
})

const completeOnboardingMock = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/api/onboarding", () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboardingMock(...args),
}))

const navigateMock = vi.fn()
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import OnboardingSlider from "../components/OnboardingSlider"

describe("OnboardingSlider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders the first slide and advances to the second slide", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <OnboardingSlider />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", {
        name: /thank you for your interest in joining our team/i,
      })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /next/i }))

    expect(
      screen.getByRole("heading", {
        name: /as a dsp, your responsibilities will include/i,
      })
    ).toBeInTheDocument()
  })
})

