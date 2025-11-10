/**
 * Onboarding API Service
 * Handles all API calls related to user onboarding and profile setup
 */

import axiosClient from '../axios';
import type { UserProfile, UserProfileResponse } from './users';

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

        return response.data.user;
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
        const response = await axiosClient.post<UserProfileResponse>("/users/create", profileData);

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

