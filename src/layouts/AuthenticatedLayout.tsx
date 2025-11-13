import {Outlet, useNavigate} from "react-router";
import {useEffect} from "react";
import {Routes} from "@/routes/constants";
import {useAuth} from "@/utils/auth";


export default function AuthenticatedLayout() {
  const {user} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate(Routes.auth.login, {replace: true});
    }
  }, [user]);
  return (
    <Outlet/>
  )
}