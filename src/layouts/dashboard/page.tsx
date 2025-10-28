import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@/features/auth"
import { useSelector } from "react-redux"
import type { RootState } from "@/store/redux/store"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const reduxUser = useSelector((state: RootState) => state.auth?.user)
  const navigate = useNavigate()

  useEffect(() => {
    console.log('[Dashboard] Auth state:', { user: user?.email, loading })
    console.log('[Dashboard] Redux user:', reduxUser?.email)
  }, [user, loading, reduxUser])

  useEffect(() => {
    if (!loading && !user) {
      console.log('[Dashboard] No user found, redirecting to login')
      navigate("/login")
    }
  }, [user, loading, navigate])

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#17a2b8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#17a2b8] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Care on Board</h1>
                <p className="text-sm text-gray-500">Application Portal</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user.email?.split("@")[0]}!</h2>
          <p className="text-gray-600">Dashboard goes here.</p>
        </div>
      </main>
    </div>
  )
}
