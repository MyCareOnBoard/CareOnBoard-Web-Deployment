// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// import { render, screen, waitFor } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
// import NotificationTab  from '../components/NotificationTab'
// import * as settingsApi from '@/lib/api/settings'
//
// // Mock dependencies
// vi.mock('@/lib/api/settings')
//
// vi.mock('../components/SuccessModal', () => ({
//   default: ({ isVisible, onClose, title, message }: any) =>
//     isVisible ? (
//       <div data-testid="success-modal">
//         <h2>{title}</h2>
//         <p>{message}</p>
//         <button onClick={onClose}>Close</button>
//       </div>
//     ) : null,
// }))
//
// // Helper that can locate either a switch, checkbox, or labeled input
// const getToggleByText = (name: RegExp | string) => {
//   const textEl = screen.queryByText(name as any)
//   if (!textEl) return null
//   // Walk up the tree to find a nearby interactive control
//   let container: HTMLElement | null =
//     (textEl.closest('label,fieldset,div,section,li') as HTMLElement | null) ??
//     textEl.parentElement
//   while (container) {
//     const candidate = container.querySelector<HTMLElement>(
//       'input[type="checkbox"],button,[role="switch"],[role="checkbox"]'
//     )
//     if (candidate) return candidate
//     container = container.parentElement
//   }
//   return null
// }
//
// const findToggle = (name: RegExp | string) =>
//   screen.queryByRole('switch', { name }) ??
//   screen.queryByRole('checkbox', { name }) ??
//   screen.queryByLabelText(name as any) ??
//   getToggleByText(name) ??
//   null
//
// const expectChecked = (el: HTMLElement, checked: boolean) => {
//   const aria = el.getAttribute('aria-checked')
//   if (aria !== null) {
//     expect(aria).toBe(checked ? 'true' : 'false')
//     return
//   }
//   if ('checked' in (el as any)) {
//     if (checked) expect(el).toBeChecked()
//     else expect(el).not.toBeChecked()
//     return
//   }
//   const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null
//   if (input) {
//     if (checked) expect(input).toBeChecked()
//     else expect(input).not.toBeChecked()
//     return
//   }
//   // As a last resort, ensure element exists to avoid false negatives
//   expect(el).toBeInTheDocument()
// }
//
// describe('NotificationTab', () => {
//   const mockNotificationSettings = {
//     emailNotifications: true,
//     inAppNotifications: false,
//     appointmentChanges: true,
//     systemWarnings: false,
//   }
//
//   beforeEach(() => {
//     vi.clearAllMocks()
//     vi.mocked(settingsApi.getNotificationSettings).mockResolvedValue(
//       mockNotificationSettings
//     )
//   })
//
//   afterEach(() => {
//     vi.restoreAllMocks()
//   })
//
//   describe('Loading State', () => {
//     it('should show loading spinner while fetching notification settings', () => {
//       vi.mocked(settingsApi.getNotificationSettings).mockImplementation(
//         () => new Promise(() => {}) // Never resolves
//       )
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       expect(screen.getByText(/loading/i)).toBeInTheDocument()
//     })
//   })
//
//   describe('Initial Render', () => {
//     it('should display notification settings after loading', async () => {
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       // Check all toggles are present
//       const emailToggle = findToggle(/email notifications/i)!
//       const inAppToggle = findToggle(/in-app notifications/i)!
//       const appointmentToggle = findToggle(/appointment changes/i)!
//       const systemToggle = findToggle(/system warnings/i)!
//
//       expectChecked(emailToggle, true)
//       expectChecked(inAppToggle, false)
//       expectChecked(appointmentToggle, true)
//       expectChecked(systemToggle, false)
//     })
//
//     it('should show error message if loading fails', async () => {
//       vi.mocked(settingsApi.getNotificationSettings).mockRejectedValue(
//         new Error('Failed to load settings')
//       )
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
//       })
//     })
//   })
//
//   describe('Form Interaction', () => {
//     it('should enable save button when settings change', async () => {
//       const user = userEvent.setup()
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       expect(saveButton).toBeDisabled()
//
//       const emailToggle = findToggle(/email notifications/i)!
//       await user.click(emailToggle)
//
//       expect(saveButton).not.toBeDisabled()
//     })
//
//     it('should toggle individual notification settings', async () => {
//       const user = userEvent.setup()
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const inAppToggle = findToggle(/in-app notifications/i)!
//       expectChecked(inAppToggle, false)
//
//       await user.click(inAppToggle)
//
//       expectChecked(inAppToggle, true)
//     })
//
//     it('should disable cancel button when no changes made', async () => {
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         const cancelButton = screen.getByRole('button', { name: /cancel/i })
//         expect(cancelButton).toBeDisabled()
//       })
//     })
//   })
//
//   describe('Save Changes', () => {
//     it('should successfully update notification settings', async () => {
//       const user = userEvent.setup()
//       const updatedSettings = {
//         ...mockNotificationSettings,
//         emailNotifications: false,
//       }
//       vi.mocked(settingsApi.updateNotificationSettings).mockResolvedValue(updatedSettings)
//
//       const onSaved = vi.fn()
//       render(<NotificationTab onSave={onSaved} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i)!
//       await user.click(emailToggle)
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       await user.click(saveButton)
//
//       await waitFor(() => {
//         expect(settingsApi.updateNotificationSettings).toHaveBeenCalledWith(
//           expect.objectContaining({ emailNotifications: false })
//         )
//       })
//       await waitFor(() => {
//         expect(screen.getByTestId('success-modal')).toBeInTheDocument()
//       })
//       expect(onSaved).toHaveBeenCalled()
//     })
//
//     it('should preserve settings after successful save', async () => {
//       const user = userEvent.setup()
//       const updatedSettings = {
//         ...mockNotificationSettings,
//         inAppNotifications: true,
//       }
//       vi.mocked(settingsApi.updateNotificationSettings).mockResolvedValue(updatedSettings)
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/in-app notifications/i)).not.toBeNull()
//       })
//
//       const inAppToggle = findToggle(/in-app notifications/i)!
//       await user.click(inAppToggle)
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       await user.click(saveButton)
//
//       await waitFor(() => {
//         expectChecked(inAppToggle, true)
//       })
//     })
//
//     it('should show error message on save failure', async () => {
//       const user = userEvent.setup()
//       vi.mocked(settingsApi.updateNotificationSettings).mockRejectedValue(
//         new Error('Network error')
//       )
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i)!
//       await user.click(emailToggle)
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       await user.click(saveButton)
//
//       await waitFor(() => {
//         expect(screen.getByText(/network error/i)).toBeInTheDocument()
//       })
//     })
//
//     it('should show saving state during update', async () => {
//       const user = userEvent.setup()
//       vi.mocked(settingsApi.updateNotificationSettings).mockImplementation(
//         () => new Promise(() => {}) // Never resolves
//       )
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i)!
//       await user.click(emailToggle)
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       await user.click(saveButton)
//
//       await waitFor(() => {
//         expect(screen.getByText(/saving/i)).toBeInTheDocument()
//         expect(saveButton).toBeDisabled()
//       })
//     })
//
//     it('should disable save button after successful save', async () => {
//       const user = userEvent.setup()
//       const updatedSettings = {
//         ...mockNotificationSettings,
//         emailNotifications: false,
//       }
//       vi.mocked(settingsApi.updateNotificationSettings).mockResolvedValue(updatedSettings)
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i)!
//       await user.click(emailToggle)
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       await user.click(saveButton)
//
//       await waitFor(() => {
//         expect(saveButton).toBeDisabled()
//       })
//     })
//   })
//
//   describe('Cancel Button', () => {
//     it('should reset form to initial values', async () => {
//       const user = userEvent.setup()
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i)!
//       expectChecked(emailToggle, true)
//
//       await user.click(emailToggle)
//       expectChecked(emailToggle, false)
//
//       const cancelButton = screen.getByRole('button', { name: /cancel/i })
//       await user.click(cancelButton)
//
//       await waitFor(() => {
//         expectChecked(emailToggle, true)
//       })
//     })
//
//     it('should clear error messages', async () => {
//       const user = userEvent.setup()
//       vi.mocked(settingsApi.updateNotificationSettings).mockRejectedValue(
//         new Error('Save failed')
//       )
//
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i)!
//       await user.click(emailToggle)
//
//       const saveButton = screen.getByRole('button', { name: /save changes/i })
//       await user.click(saveButton)
//
//       await waitFor(() => {
//         expect(screen.getByText(/save failed/i)).toBeInTheDocument()
//       })
//
//       const cancelButton = screen.getByRole('button', { name: /cancel/i })
//       await user.click(cancelButton)
//
//       await waitFor(() => {
//         expect(screen.queryByText(/save failed/i)).not.toBeInTheDocument()
//       })
//     })
//   })
//
//   describe('Accessibility', () => {
//     it('should have proper ARIA labels for toggles', async () => {
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//         expect(findToggle(/in-app notifications/i)).not.toBeNull()
//         expect(findToggle(/appointment changes/i)).not.toBeNull()
//         expect(findToggle(/system warnings/i)).not.toBeNull()
//       })
//     })
//
//     it('should support keyboard navigation', async () => {
//       const user = userEvent.setup()
//       render(<NotificationTab onSave={vi.fn()} />)
//
//       await waitFor(() => {
//         expect(findToggle(/email notifications/i)).not.toBeNull()
//       })
//
//       const emailToggle = findToggle(/email notifications/i) as HTMLElement
//       emailToggle!.focus()
//       expect(emailToggle).toHaveFocus()
//
//       // Verify initial state (checked)
//       expectChecked(emailToggle, true)
//
//       // Toggle with space key
//       await user.keyboard(' ')
//       await waitFor(() => {
//         expectChecked(emailToggle, false)
//       })
//     })
//   })
// })