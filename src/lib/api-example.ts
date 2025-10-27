/**
 * Example usage of the axios client
 * 
 * This file demonstrates how to use the global axios client
 * for making API requests to the Care-On-Board backend.
 */

import axiosClient, { setAuthToken, removeAuthToken } from './axios';
import { ApiResponse } from './api-types';

// Example: User login
export const loginUser = async (email: string, password: string) => {
    try {
        const response = await axiosClient.post<ApiResponse<{ token: string; user: any }>>('/auth/login', {
            email,
            password,
        });

        // Store the token for future requests
        if (response.data.data.token) {
            setAuthToken(response.data.data.token);
        }

        return response.data;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};

// Example: Get user profile
export const getUserProfile = async (userId: string) => {
    try {
        const response = await axiosClient.get<ApiResponse<any>>(`/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        throw error;
    }
};

// Example: Update user profile
export const updateUserProfile = async (userId: string, data: any) => {
    try {
        const response = await axiosClient.put<ApiResponse<any>>(`/users/${userId}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update user profile:', error);
        throw error;
    }
};

// Example: Logout
export const logoutUser = () => {
    removeAuthToken();
    // Additional cleanup can be done here
};

// Example: File upload
export const uploadDocument = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosClient.post<ApiResponse<{ fileUrl: string }>>('/documents/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Failed to upload document:', error);
        throw error;
    }
};

