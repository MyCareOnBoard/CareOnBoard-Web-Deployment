/**
 * Onboarding API Service
 * Handles all API calls related to user onboarding and user setup
 */

import axiosClient, { axiosClientWithoutAuth } from '../axios';
import type { User } from '@/utils/auth/types/user.types';
import type { UserResponse } from '@/lib/api/users';
import { getUser } from '@/lib/api/users';
import type { FirebaseTimestamp } from '@/utils/auth/types/user.types';

function firebaseTimestampToISOString(timestamp?: FirebaseTimestamp): string | undefined {
    if (!timestamp) {
        return undefined;
    }

    const milliseconds = timestamp._seconds * 1000 + timestamp._nanoseconds / 1_000_000;
    return new Date(milliseconds).toISOString();
}

export interface OnboardingStatus {
    completed: boolean
    completedAt?: string
}

/**
 * Create user data structure
 */
export interface CreateUserData {
    email: string;
    fullName: string;
    uid: string;
}



/**
 * Create a new user
 * Called during initial onboarding when user first signs up
 * @param userData - User data (email, fullName, uid)
 * @returns Promise with created user
 */
export async function createUser(userData: CreateUserData): Promise<User> {
    try {
        const response = await axiosClient.post<UserResponse>("/users", userData);

        if (!response.data.success || !response.data.user) {
            throw new Error("Invalid response format from server");
        }

        return response.data.user;
    } catch (err: any) {
        console.error('Failed to create user:', err);
        throw new Error(err.response?.data?.message || err.message || "Failed to create user");
    }
}

/**
 * Mark user's onboarding as completed
 * Called after user completes all onboarding steps (email verification, OTP, etc.)
 * @returns Promise with updated user data
 */
export async function completeOnboarding(): Promise<User> {
    try {
        const response = await axiosClient.put<UserResponse>("/users/profile", {
            onboardingCompleted: true
        });

        if (!response.data.success || !response.data.user) {
            throw new Error("Invalid response format from server");
        }

        return response.data.user;
    } catch (err: any) {
        console.error('Failed to complete onboarding:', err);
        throw new Error(err.response?.data?.message || err.message || "Failed to complete onboarding");
    }
}

/**
 * Check if user exists and get its status
 * Useful for determining where in the onboarding flow to redirect the user
 * @returns Promise with user or null if not found
 */
export async function checkUserStatus(): Promise<User | null> {
    try {
        return await getUser();
    } catch (err: any) {
        // If 404, user data doesn't exist yet - that's ok
        if (err.response?.status === 404 || err.message?.includes("not found")) {
            return null;
        }
        // Re-throw other errors
        throw err;
    }
}

// Alias for backward compatibility
export const checkProfileStatus = checkUserStatus;

/**
 * Get onboarding completion status for the current user
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
    try {
        console.log('🔄 [Onboarding] Fetching onboarding status...')

        // Get user data which includes onboardingCompleted field
        const user = await getUser()

        return {
            completed: user.onboardingCompleted || false,
            completedAt: firebaseTimestampToISOString(user.otpVerifiedAt), // Use OTP verification time as proxy for completion time
        }
    } catch (error: any) {
        console.warn('⚠️ [Onboarding] API call failed:', error.message)
        throw error;
    }
}

export async function getAgencyInfo(agencyId: string): Promise<any> {
    try {
        const agency = await axiosClientWithoutAuth.get(`/agencies/info/${agencyId}`);
        return agency.data;
    } catch (error: any) {
        console.error('Failed to fetch agency info:', error);
        return null;
    }
}