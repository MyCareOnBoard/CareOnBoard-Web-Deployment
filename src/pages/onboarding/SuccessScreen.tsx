import { useNavigate } from "react-router";
import SuccessMessage from "./SuccessMessage";

export default function SuccessScreen() {
  const nav = useNavigate();

  return (
    <SuccessMessage
      title="Email Verification Complete!"
      // message="Your email has been verified. You can now continue to your dashboard."
      buttonText="Continue to Dashboard"
      onButtonClick={() => nav("/applicant/dashboard")}
    />
  );
}
