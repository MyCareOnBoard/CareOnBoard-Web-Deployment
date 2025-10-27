/**
 * Authentication Utilities
 *
 * This file contains dummy authentication functions for development.
 * Replace with real Firebase or backend authentication in production.
 */

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

// Dummy user database (in-memory)
const DUMMY_USERS: User[] = [
  {
    id: "1",
    email: "user@example.com",
    name: "John Doe",
    createdAt: new Date("2024-01-01"),
  },
]

/**
 * Simulate login with email and password
 * @param email - User email
 * @param password - User password
 * @returns Authentication response with user data or error
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Check if user exists
  const user = DUMMY_USERS.find((u) => u.email === email)

  if (!user) {
    return {
      success: false,
      error: "Invalid email or password",
    }
  }

  // In real implementation, verify password hash
  if (password.length < 6) {
    return {
      success: false,
      error: "Invalid email or password",
    }
  }

  return {
    success: true,
    user,
  }
}

/**
 * Simulate user registration
 * @param name - User full name
 * @param email - User email
 * @param password - User password
 * @returns Authentication response with user data or error
 */
export async function registerWithEmail(name: string, email: string, password: string): Promise<AuthResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Check if user already exists
  const existingUser = DUMMY_USERS.find((u) => u.email === email)

  if (existingUser) {
    return {
      success: false,
      error: "Email already registered",
    }
  }

  // Validate password
  if (password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters",
    }
  }

  // Create new user
  const newUser: User = {
    id: String(DUMMY_USERS.length + 1),
    email,
    name,
    createdAt: new Date(),
  }

  DUMMY_USERS.push(newUser)

  return {
    success: true,
    user: newUser,
  }
}

/**
 * Simulate password reset email
 * @param email - User email
 * @returns Success status
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Check if user exists
  const user = DUMMY_USERS.find((u) => u.email === email)

  if (!user) {
    return {
      success: false,
      error: "No account found with this email",
    }
  }

  // In real implementation, send actual email
  console.log(`[DUMMY] Password reset email sent to: ${email}`)

  return {
    success: true,
  }
}

/**
 * Simulate logout
 */
export async function logout(): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // In real implementation, clear tokens/sessions
  console.log("[DUMMY] User logged out")
}

/**
 * Get current user from session/token
 * In real implementation, verify JWT or session token
 */
export async function getCurrentUser(): Promise<User | null> {
  // Check localStorage for dummy session
  if (typeof window !== "undefined") {
    const userJson = localStorage.getItem("currentUser")
    if (userJson) {
      return JSON.parse(userJson)
    }
  }

  return null
}

/**
 * Save user session (dummy implementation)
 */
export function saveUserSession(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("currentUser", JSON.stringify(user))
  }
}

/**
 * Clear user session (dummy implementation)
 */
export function clearUserSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser")
  }
}
