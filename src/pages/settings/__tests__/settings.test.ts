// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// import { getAccountInfo, updateAccountInfo, getNotificationSettings, updateNotificationSettings } from '../settings'
// import { getAuth, updateProfile } from 'firebase/auth'
//
// // Mock dependencies
// vi.mock('../otp')
// vi.mock('firebase/auth')
// vi.mock('@/lib/firebase', () => ({
//   auth: {},
//   getFreshIdToken: vi.fn(),
// }))
//
// describe('Settings API', () => {
//   const mockUser = {
//     uid: 'test-user-123',
//     email: 'test@example.com',
//     displayName: 'Test User',
//     photoURL: 'https://example.com/photo.jpg',
//     getIdToken: vi.fn().mockResolvedValue('mock-token'),
//   }
//
//   beforeEach(() => {
//     vi.clearAllMocks()
//     localStorage.clear()
//
//     // Mock Firebase Auth
//     vi.mocked(getAuth).mockReturnValue({
//       currentUser: mockUser,
//       authStateReady: vi.fn().mockResolvedValue(undefined),
//     } as any)
//   })
//
//   afterEach(() => {
//     vi.clearAllMocks()
//   })
//
//   describe('getAccountInfo', () => {
//     it('should return account info from API when available', async () => {
//       const mockApiResponse = {
//         success: true,
//         user: {
//           email: 'api@example.com',
//           fullName: 'API User',
//           profilePicture: 'https://api.example.com/photo.jpg',
//         },
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockApiResponse)
//
//       const result = await getAccountInfo()
//
//       expect(result).toEqual({
//         email: 'api@example.com',
//         fullName: 'API User',
//         profilePicture: 'https://api.example.com/photo.jpg',
//       })
//       expect(apiFetch).toHaveBeenCalledWith('/users/profile', { method: 'GET' })
//     })
//
//     it('should fall back to Firebase data when API fails', async () => {
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
//
//       const result = await getAccountInfo()
//
//       expect(result).toEqual({
//         email: 'test@example.com',
//         fullName: 'Test User',
//         profilePicture: 'https://example.com/photo.jpg',
//       })
//     })
//
//     it('should throw error when user is not authenticated', async () => {
//       vi.mocked(getAuth).mockReturnValue({
//         currentUser: null,
//         authStateReady: vi.fn().mockResolvedValue(undefined),
//       } as any)
//
//       await expect(getAccountInfo()).rejects.toThrow('User not authenticated')
//     })
//
//     it('should merge API and Firebase data correctly', async () => {
//       const mockApiResponse = {
//         success: true,
//         user: {
//           fullName: 'Updated Name',
//         },
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockApiResponse)
//
//       const result = await getAccountInfo()
//
//       expect(result).toEqual({
//         email: 'test@example.com', // From Firebase
//         fullName: 'Updated Name', // From API
//         profilePicture: 'https://example.com/photo.jpg', // From Firebase
//       })
//     })
//   })
//
//   describe('updateAccountInfo', () => {
//     it('should upload image and update profile successfully', async () => {
//       const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
//
//       const mockUploadResponse = {
//         success: true,
//         data: {
//           url: 'https://storage.example.com/test.jpg',
//         },
//       }
//
//       const mockUpdateResponse = {
//         success: true,
//         user: {
//           email: 'test@example.com',
//           fullName: 'Updated User',
//           profilePicture: 'https://storage.example.com/test.jpg',
//         },
//       }
//
//       vi.mocked(apiFetch)
//         .mockResolvedValueOnce(mockUploadResponse) // First call: image upload
//         .mockResolvedValueOnce(mockUpdateResponse) // Second call: profile update
//
//       vi.mocked(updateProfile).mockResolvedValue(undefined)
//
//       const result = await updateAccountInfo({
//         fullName: 'Updated User',
//         profilePictureFile: mockFile,
//       })
//
//       expect(result).toEqual({
//         email: 'test@example.com',
//         fullName: 'Updated User',
//         profilePicture: 'https://storage.example.com/test.jpg',
//       })
//
//       expect(apiFetch).toHaveBeenCalledTimes(2)
//       expect(apiFetch).toHaveBeenNthCalledWith(1, '/profilePictureUpload', expect.any(Object))
//       expect(apiFetch).toHaveBeenNthCalledWith(2, '/users/profile', expect.any(Object))
//       expect(updateProfile).toHaveBeenCalled()
//     })
//
//     it('should update only name when no image provided', async () => {
//       const mockUpdateResponse = {
//         success: true,
//         user: {
//           email: 'test@example.com',
//           fullName: 'New Name',
//           profilePicture: 'https://example.com/photo.jpg',
//         },
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockUpdateResponse)
//       vi.mocked(updateProfile).mockResolvedValue(undefined)
//
//       const result = await updateAccountInfo({
//         fullName: 'New Name',
//       })
//
//       expect(result.fullName).toBe('New Name')
//       expect(apiFetch).toHaveBeenCalledWith('/users/profile', expect.any(Object))
//       expect(apiFetch).toHaveBeenCalledTimes(1) // Only profile update, no image upload
//     })
//
//     it('should throw error when image upload fails', async () => {
//       const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
//
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Upload failed'))
//
//       await expect(
//         updateAccountInfo({
//           fullName: 'Test',
//           profilePictureFile: mockFile,
//         })
//       ).rejects.toThrow('Failed to upload profile picture')
//     })
//
//     it('should fall back to Firebase when API fails for name-only update', async () => {
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
//       vi.mocked(updateProfile).mockResolvedValue(undefined)
//
//       const result = await updateAccountInfo({
//         fullName: 'Fallback Name',
//       })
//
//       expect(result.fullName).toBe('Fallback Name')
//       expect(updateProfile).toHaveBeenCalledWith(mockUser, {
//         displayName: 'Fallback Name',
//       })
//     })
//
//     it('should require server connection for image uploads', async () => {
//       const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
//
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
//
//       await expect(
//         updateAccountInfo({
//           profilePictureFile: mockFile,
//         })
//       ).rejects.toThrow('Image upload requires server connection')
//     })
//   })
//
//   describe('getNotificationSettings', () => {
//     it('should return settings from API when available', async () => {
//       const mockApiResponse = {
//         success: true,
//         notifications: {
//           emailNotifications: true,
//           inAppNotifications: false,
//           appointmentChanges: true,
//           systemWarnings: false,
//         },
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockApiResponse)
//
//       const result = await getNotificationSettings()
//
//       expect(result).toEqual(mockApiResponse.notifications)
//       expect(apiFetch).toHaveBeenCalledWith('/userProfile/notifications', { method: 'GET' })
//     })
//
//     it('should fall back to localStorage when API fails', async () => {
//       const storedSettings = {
//         emailNotifications: false,
//         inAppNotifications: true,
//         appointmentChanges: false,
//         systemWarnings: true,
//       }
//
//       localStorage.setItem('notification_settings', JSON.stringify(storedSettings))
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
//
//       const result = await getNotificationSettings()
//
//       expect(result).toEqual(storedSettings)
//     })
//
//     it('should return default settings when no data available', async () => {
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
//
//       const result = await getNotificationSettings()
//
//       expect(result).toEqual({
//         emailNotifications: true,
//         inAppNotifications: true,
//         appointmentChanges: true,
//         systemWarnings: true,
//       })
//     })
//
//     it('should save API response to localStorage as backup', async () => {
//       const mockApiResponse = {
//         success: true,
//         notifications: {
//           emailNotifications: false,
//           inAppNotifications: false,
//           appointmentChanges: false,
//           systemWarnings: false,
//         },
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockApiResponse)
//
//       await getNotificationSettings()
//
//       const stored = localStorage.getItem('notification_settings')
//       expect(JSON.parse(stored!)).toEqual(mockApiResponse.notifications)
//     })
//   })
//
//   describe('updateNotificationSettings', () => {
//     it('should update settings via API successfully', async () => {
//       const newSettings = {
//         emailNotifications: false,
//         inAppNotifications: true,
//         appointmentChanges: false,
//         systemWarnings: true,
//       }
//
//       const mockApiResponse = {
//         success: true,
//         notifications: newSettings,
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockApiResponse)
//
//       const result = await updateNotificationSettings(newSettings)
//
//       expect(result).toEqual(newSettings)
//       expect(apiFetch).toHaveBeenCalledWith('/userProfile/notifications', {
//         method: 'PUT',
//         body: JSON.stringify(newSettings),
//       })
//     })
//
//     it('should save to localStorage when API fails', async () => {
//       const newSettings = {
//         emailNotifications: true,
//         inAppNotifications: false,
//         appointmentChanges: true,
//         systemWarnings: false,
//       }
//
//       vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))
//
//       const result = await updateNotificationSettings(newSettings)
//
//       expect(result).toEqual(newSettings)
//
//       const stored = localStorage.getItem('notification_settings')
//       expect(JSON.parse(stored!)).toEqual(newSettings)
//     })
//
//     it('should save API response to localStorage as backup', async () => {
//       const newSettings = {
//         emailNotifications: false,
//         inAppNotifications: false,
//         appointmentChanges: false,
//         systemWarnings: false,
//       }
//
//       const mockApiResponse = {
//         success: true,
//         notifications: newSettings,
//       }
//
//       vi.mocked(apiFetch).mockResolvedValue(mockApiResponse)
//
//       await updateNotificationSettings(newSettings)
//
//       const stored = localStorage.getItem('notification_settings')
//       expect(JSON.parse(stored!)).toEqual(newSettings)
//     })
//   })
// })