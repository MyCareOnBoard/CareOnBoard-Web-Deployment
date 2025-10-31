import React from "react";
import { Routes, Route, useNavigate } from "react-router";
import OnboardingSlider from "./components/OnboardingSlider";
import VerifyEmail from "./VerifyEmail";
import VerifyOTP from "./VerifyOTP";
import SuccessMessage from "./components/SuccessMessage";
import { Routes as AppRoutes } from "@/routes/constants";

export default function OnboardingPage() {

  return (
    <Routes>
      <Route
        path="/"
        element={<OnboardingSlider />}/>
      <Route path="email" element={<VerifyEmail />} />
      <Route path="otp" element={<VerifyOTP />} />
      <Route path="success" element={<SuccessMessage />} />
    </Routes>
  );
}
