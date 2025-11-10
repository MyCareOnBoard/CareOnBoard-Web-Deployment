import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, vi, expect } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"

// Hoisted mock factory
function slideFourFactory() {
  return {
    default: ({ onInnerComplete }: { onInnerComplete?: (v: boolean) => void }) => {
      React.useEffect(() => {
        onInnerComplete?.(true)
      }, [])
      return <div data-testid="mock-slide-four">Mocked SlideFour Inner Slider</div>
    },
  }
}

// framer-motion mock
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}))

// SlideFour mock (adjust path if different in OnboardingPage)
vi.mock("../components/SlideFour", slideFourFactory)

// Import after mocks
import OnboardingPage from "../index"

function buildRouter(initialPath: string = "/onboarding") {
  return createMemoryRouter(
    [
      { path: "/onboarding/*", element: <OnboardingPage /> },
      { path: "/onboarding/email", element: <div>VERIFY EMAIL PAGE</div> },
    ],
    { initialEntries: [initialPath], initialIndex: 0 }
  )
}

describe("Onboarding flow", () => {
  it(
    "navigates through onboarding and reaches email verification",
    async () => {
      const router = buildRouter()
      render(<RouterProvider router={router} />)
      const user = userEvent.setup()

      // Optional initial marker (ignore if not present)
      await screen.findByText(/onboard|welcome|care/i, {}, { timeout: 2000 }).catch(() => {})

      // Helper: try to find a button among common “next” labels
      const nextPatterns = [
        /^next$/i,
        /next step/i,
        /continue/i,
        /proceed/i,
        /get started/i,
        /^start$/i,
      ]
      const queryNextButton = () => {
        // exact match first
        const exact = screen.queryByRole("button", { name: /^next$/i })
        if (exact) return exact
        // try other common labels
        for (const rx of nextPatterns) {
          const btn = screen.queryByRole("button", { name: rx })
          if (btn) return btn
        }
        // last resort: any button containing 'next'
        const any = screen
          .queryAllByRole("button")
          .find(b => /next/i.test((b.textContent || "").trim()))
        return any || null
      }

      // Click “Next-like” buttons until a “Finish” appears or we auto-navigate
      for (let i = 0; i < 8; i++) {
        // If already at email page, stop
        if (screen.queryByText(/verify email page/i)) break

        const finishBtn = screen.queryByRole("button", { name: /finish/i })
        if (finishBtn) {
          await user.click(finishBtn)
          break
        }
 btn = await locateNext()






























})  )    20000    },      ).toBeInTheDocument()        await screen.findByText(/VERIFY EMAIL PAGE/i, {}, { timeout: 5000 })      expect(      // Assert final route content      }        await user.click(finish)      if (finish) {      const finish = screen.queryByRole("button", { name: /finish/i })      // If Finish appeared after loop, click it      }        }          break          // Neither Next nor Finish rendered in time; exit loop        } catch {          await user.click(awaitedNext)          const awaitedNext = await screen.findByRole("button", { name: /next|continue|proceed|get started|start/i }, { timeout: 1000 })        try {        // Small wait to allow render; if still nothing, break the loop        }          continue          await user.click(nextBtn)        if (nextBtn) {        const nextBtn = queryNextButton()          expect(btn).toBeTruthy()
          return btn
        }, { timeout: 4000 })
        await user.click(nextBtn!)
      }

      // Now Finish should exist
      const finishBtn = await screen.findByRole("button", { name: /finish/i }, { timeout: 5000 })
      await user.click(finishBtn)

      // Final route content
      expect(await screen.findByText(/VERIFY EMAIL PAGE/i, {}, { timeout: 5000 })).toBeInTheDocument()
    },
    20000
  )
})

function locateNext(): any {
  throw new Error("Function not implemented.")
}


function toBeInTheDocument() {
  throw new Error("Function not implemented.")
}
