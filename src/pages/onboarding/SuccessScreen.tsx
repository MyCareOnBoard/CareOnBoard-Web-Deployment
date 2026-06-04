import { useNavigate } from "react-router";
import SuccessMessage from "./SuccessMessage";
import { Routes } from "@/routes/constants";

export default function SuccessScreen() {
  const nav = useNavigate();

  return (
    <SuccessMessage
      title="Email Verification Complete!"
      // message="Your email has been verified. You can now continue to your dashboard."
      buttonText="Continue"
      onButtonClick={() => nav(Routes.auth.mfaEnroll, { replace: true })}
    />
  );
}
