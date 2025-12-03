/**
 * Onboarding API Service
 * Handles all API calls related to user onboarding and profile setup
 */

import axiosClient, { axiosClientWithoutAuth } from '../axios';
import type { UserProfile } from '@/utils/auth/types/user.types';
import type { UserProfileResponse } from '@/lib/api/users';
import { getUserProfile } from '@/lib/api/users';
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
 * Create user profile data structure
 */
export interface CreateUserProfileData {
    email: string;
    fullName: string;
    uid: string;
}



/**
 * Create a new user profile
 * Called during initial onboarding when user first signs up
 * @param profileData - User profile data (email, fullName, uid)
 * @returns Promise with created user profile
 */
export async function createUserProfile(profileData: CreateUserProfileData): Promise<UserProfile> {
    try {
        const response = await axiosClient.post<UserProfileResponse>("/users", profileData);

        if (!response.data.success || !response.data.user) {
            throw new Error("Invalid response format from server");
        }

        return response.data.user;
    } catch (err: any) {
        console.error('Failed to create user profile:', err);
        throw new Error(err.response?.data?.message || err.message || "Failed to create user profile");
    }
}

/**
 * Mark user's onboarding as completed
 * Called after user completes all onboarding steps (email verification, OTP, etc.)
 * @returns Promise with updated user profile
 */
export async function completeOnboarding(): Promise<UserProfile> {
    try {
        const response = await axiosClient.put<UserProfileResponse>("/users/profile", {
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
 * Check if user profile exists and get its status
 * Useful for determining where in the onboarding flow to redirect the user
 * @returns Promise with profile or null if not found
 */
export async function checkProfileStatus(): Promise<UserProfile | null> {
    try {
        return await getUserProfile();
    } catch (err: any) {
        // If 404, profile doesn't exist yet - that's ok
        if (err.response?.status === 404 || err.message?.includes("not found")) {
            return null;
        }
        // Re-throw other errors
        throw err;
    }
}

/**
 * Get onboarding completion status for the current user
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
    try {
        console.log('🔄 [Onboarding] Fetching onboarding status...')

        // Get user profile which includes onboardingCompleted field
        const profile = await getUserProfile()

        console.log('📥 [Onboarding] Profile data:', profile)
        console.log('✅ [Onboarding] Status from API - completed:', profile.onboardingCompleted)

        return {
            completed: profile.onboardingCompleted || false,
            completedAt: firebaseTimestampToISOString(profile.otpVerifiedAt), // Use OTP verification time as proxy for completion time
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