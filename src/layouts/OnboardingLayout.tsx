import { Fragment } from 'react'
import { Outlet } from 'react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function OnboardingLayout() {
  return (
    <ProtectedRoute>
      <Fragment>
        <Outlet />
      </Fragment>
    </ProtectedRoute>
  )
}
