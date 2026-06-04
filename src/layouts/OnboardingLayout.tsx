import { Fragment } from 'react'
import { Outlet } from 'react-router'
import { OnboardingRoute } from '@/components/OnboardingRoute'

export default function OnboardingLayout() {
  return (
    <OnboardingRoute>
      <Fragment>
        <Outlet />
      </Fragment>
    </OnboardingRoute>
  )
}
