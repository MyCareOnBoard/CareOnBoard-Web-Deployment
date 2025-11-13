import {Fragment} from "react";
import {Outlet} from "react-router";


export default function OnboardingLayout() {
  return (
    <Fragment>
      <Outlet />
    </Fragment>
  )
}