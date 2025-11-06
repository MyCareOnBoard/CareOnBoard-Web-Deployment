import {Button} from "@/components/ui/button";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";

export default function SplashScreen() {
  const navigate = useNavigate();
  return (
    <div className={"font-bold text-2xl text-center h-screen flex items-center justify-center flex-col"}>
      <h1>Splash Screen</h1>
      <Button onClick={() => navigate(Routes.login)}>Login</Button>
    </div>
  );
}