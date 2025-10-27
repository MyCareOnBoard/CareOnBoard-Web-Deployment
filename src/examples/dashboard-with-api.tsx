/**
 * Example: Dashboard Page with API Integration
 * 
 * This demonstrates how to fetch data from your backend
 * using Firebase authentication tokens
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ApiStats {
  totalUsers: number;
  activeUsers: number;
  lastSync: string;
}

export default function DashboardExample() {
  const { user, getToken } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Example 1: Fetch user profile from your backend
      const profile = await api.get<UserData>(`/users/${user?.id}`);
      setUserData(profile);

      // Example 2: Fetch dashboard statistics
      const statistics = await api.get<ApiStats>('/dashboard/stats');
      setStats(statistics);

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserData>) => {
    try {
      // Example 3: Update user profile
      const updated = await api.put<UserData>(`/users/${user?.id}`, updates);
      setUserData(updated);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    }
  };

  const manualTokenExample = async () => {
    // Example 4: Get token manually if you need custom requests
    const token = await getToken();
    
    if (token) {
      // Send token to your backend
      const response = await fetch('https://your-backend.com/api/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ some: 'data' }),
      });
      
      const data = await response.json();
      console.log('Custom API response:', data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00B4B8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          {userData && (
            <div className="space-y-2">
              <p><strong>Name:</strong> {userData.name}</p>
              <p><strong>Email:</strong> {userData.email}</p>
              <p><strong>Role:</strong> {userData.role}</p>
              <button
                onClick={() => updateProfile({ name: 'Updated Name' })}
                className="mt-4 px-4 py-2 bg-[#00B4B8] text-white rounded-lg hover:bg-[#148a9c]"
              >
                Update Profile
              </button>
            </div>
          )}
        </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Active Users</p>
                <p className="text-2xl font-bold text-green-900">{stats.activeUsers}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">Last Sync</p>
                <p className="text-lg font-semibold text-purple-900">{stats.lastSync}</p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Token Example Button */}
        <button
          onClick={manualTokenExample}
          className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Test Manual Token
        </button>
      </div>
    </div>
  );
}
