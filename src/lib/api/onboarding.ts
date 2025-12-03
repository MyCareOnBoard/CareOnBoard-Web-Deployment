/**
 * Onboarding API Service
 * Handles all API calls related to user onboarding and profile setup
 */

import axiosClient, {axiosClientWithoutAuth} from '../axios';
import { seedAgency } from './agencies';
import { UserType, type FirebaseTimestamp, type UserProfile, type UserProfileResponse } from './users';

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
 * Get the authenticated user's profile
 * Used during onboarding to check if profile exists
 * @returns Promise with user profile data
 */
export async function getUserProfile(): Promise<UserProfile> {
    try {
        const response = await axiosClient.get<UserProfileResponse>("/users/profile");

        if (!response.data.success || !response.data.user) {
            throw new Error("Invalid response format from server");
        }

        let profile = response.data.user

        // Load user-specific data based on user type
        let userData: Record<string, any> | undefined = undefined

        if (profile.userType === UserType.AGENCY && !profile?.data) {
            try {
                const agency = await seedAgency()
                profile.data = agency

            } catch (error: any) {

            }
        }

        return profile;
    } catch (err: any) {
        // Re-throw with more context
        if (err.response?.status === 404) {
            throw new Error("Profile not found. Please complete your onboarding first.");
        }
        console.error('Failed to get user profile:', err);
        throw err;
    }
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