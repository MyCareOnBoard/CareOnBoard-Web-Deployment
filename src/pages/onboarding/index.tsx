import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import OnboardingSlider from "./components/OnboardingSlider";
import VerifyEmail from "./VerifyEmail";
import VerifyOTP from "./VerifyOTP";
import SuccessMessage from "./components/SuccessMessage";

export default function OnboardingPage() {
  const nav = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={<OnboardingSlider />}/>
      <Route path="email" element={<VerifyEmail />} />
      <Route path="otp" element={<VerifyOTP />} />

      <Route
        path="success"
        element={
          <SuccessMessage
            title="Email Verification Complete!"
            buttonText="Continue to Dashboard"
            onButtonClick={() => nav("/dashboard")}
          />
        }
      />
    </Routes>
  );
}
