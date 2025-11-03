import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
/**
 * Mock framer-motion to keep tests synchronous and avoid animation timing issues.
 * We replace motion.div with a plain div and AnimatePresence with a fragment.
 */
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("react");
  return {
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: (props: any) => React.createElement("div", props, props.children),
    },
  };
});

/**
 * IMPORTANT: Mock SlideFour to immediately call onInnerComplete(true)
 * This makes the inner slider considered "complete" during tests so the Finish button is enabled.
 *
 * Adjust the import path here to match your project layout relative to this test file.
 * The OnboardingSlider imports SlideFour from "./components/SlideFour" — so we mock that path.
 */
vi.mock("../components/SlideFour", () => {
  return {
    default: ({ onInnerComplete }: { onInnerComplete?: (v: boolean) => void }) => {
      React.useEffect(() => {
        if (typeof onInnerComplete === "function") onInnerComplete(true);
      }, []);
      return <div>Mocked SlideFour Inner Slider</div>;
    },
  };
});

// Now import the OnboardingPage (after mocks)
import OnboardingPage from "../index";

describe("Onboarding flow (integration)", () => {
  it("renders onboarding slider, navigates slides and reaches email page", async () => {
    // Render the onboarding routes and also register a simple /onboarding/email route target
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          {/* Parent onboarding index that internally uses nested Routes */}
          <Route path="/onboarding/*" element={<OnboardingPage />} />

          {/* A simple placeholder component for the email verification route so navigation has a target */}
          <Route path="/onboarding/email" element={<div>VERIFY EMAIL PAGE</div>} />
        </Routes>
      </MemoryRouter>
    );

    // The slider should render and show "Next" button
    const nextBtn = await screen.findByRole("button", { name: /next/i });
    expect(nextBtn).toBeTruthy();

    // Click Next until we reach the last slide. There are 4 slides; click Next 3 times to reach last slide.
    // (You can adapt number of clicks if your slides change)
    fireEvent.click(nextBtn); // 1 -> slide 2
    fireEvent.click(nextBtn); // 2 -> slide 3
    fireEvent.click(nextBtn); // 3 -> slide 4 (inner slide mocked will mark innerComplete true)

    // After innerComplete is set by the mocked SlideFour, the button text should change to "Finish"
    const finishBtn = await screen.findByRole("button", { name: /finish/i });
    expect(finishBtn).toBeTruthy();

    // Click Finish — OnboardingSlider navigates to /onboarding/email
    fireEvent.click(finishBtn);

    // Verify that the placeholder email page is now shown
    expect(await screen.findByText(/VERIFY EMAIL PAGE/i)).toBeInTheDocument();
  }, 10000);
});
