import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

/**
 * Super Admin Account Info Interface
 */
export interface SuperAdminAccountInfo {
  fullName: string;
  email: string;
  phone: string;
  locationAccess: boolean;
}

/**
 * Super Admin Notification Settings Interface
 */
export interface SuperAdminNotifications {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  appointmentChanges: boolean;
  systemWarnings: boolean;
}

/**
 * Super Admin Settings Interface
 */
export interface SuperAdminSettings {
  accountInfo: SuperAdminAccountInfo;
  notifications: SuperAdminNotifications;
}

/**
 * Update Super Admin Settings Request
 * Email is read-only, cannot be changed
 */
export interface UpdateSuperAdminSettingsRequest {
  accountInfo: {
    fullName: string;
    phone: string;
    locationAccess: boolean;
  };
  notifications: SuperAdminNotifications;
}

/**
 * Delete Account Request
 */
export interface DeleteAccountRequest {
  confirmation: string;
}

/**
 * Super Admin Settings Response
 */
export interface SuperAdminSettingsResponse extends ApiResponse<SuperAdminSettings> {
  success: boolean;
  data: SuperAdminSettings;
}

/**
 * Update Settings Response
 */
export interface UpdateSettingsResponse extends ApiResponse<SuperAdminSettings> {
  success: boolean;
  message: string;
  data: SuperAdminSettings;
}

/**
 * Delete Account Response
 */
export interface DeleteAccountResponse extends ApiResponse {
  success: boolean;
  message: string;
}

/**
 * Get current super admin settings
 * @returns Promise with super admin settings data
 */
export async function getSuperAdminSettings(): Promise<SuperAdminSettings> {
  try {
    const response = await axiosClient.get<SuperAdminSettingsResponse>(
      "/superAdminSettings/settings"
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch super admin settings:", error);
    throw error;
  }
}

/**
 * Update super admin settings
 * @param data - Updated settings data (email cannot be changed)
 * @returns Promise with updated settings
 */
export async function updateSuperAdminSettings(
  data: UpdateSuperAdminSettingsRequest
): Promise<UpdateSettingsResponse> {
  try {
    const response = await axiosClient.put<UpdateSettingsResponse>(
      "/superAdminSettings/settings",
      data
    );
    return response.data;
  } catch (error) {
    console.error("Failed to update super admin settings:", error);
    throw error;
  }
}

/**
 * Delete own super admin account
 * Requires explicit confirmation ("DELETE MY ACCOUNT")
 * Cannot delete if you are the only active super admin
 * @param confirmation - Confirmation string ("DELETE MY ACCOUNT")
 * @returns Promise with deletion confirmation
 */
export async function deleteSuperAdminAccount(
  confirmation: string
): Promise<DeleteAccountResponse> {
  try {
    const response = await axiosClient.delete<DeleteAccountResponse>(
      "/superAdminSettings/account",
      {
        data: {
          confirmation
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to delete super admin account:", error);
    throw error;
  }
}
