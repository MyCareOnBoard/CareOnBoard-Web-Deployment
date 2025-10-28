# Firebase Authentication Setup Guide

## ✅ What Has Been Fixed

Your Firebase authentication code has been completely fixed and is now ready to use. Here's what was corrected:

### 1. **Environment Variables**
- ✅ Fixed Firebase config to use Vite's `import.meta.env` instead of Next.js `process.env`
- ✅ Updated `.env.example` with all required Firebase environment variables
- ✅ Added TypeScript definitions for Vite environment variables in `vite-env.d.ts`

### 2. **Type Definitions**
- ✅ Created complete user type definitions in `src/features/auth/types/user.types.ts`
- ✅ Fixed TypeScript errors in Firebase auth service
- ✅ Added proper type safety throughout the auth system

### 3. **Redux Integration**
- ✅ Created complete auth slice with async thunks for login, signup, logout, etc.
- ✅ Added auth reducer to Redux store
- ✅ Created auth selectors for accessing auth state
- ✅ Fixed Redux hooks with proper typing

### 4. **Firebase Service**
- ✅ Fixed import paths to use correct `@/lib/firebase` location
- ✅ Added proper type annotations for Firebase callbacks
- ✅ Implemented complete auth service with error handling

### 5. **Dependencies**
- ✅ Installed Firebase SDK package

## 🚀 How to Set Up Firebase

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

### Step 2: Enable Authentication

1. In your Firebase project, click on "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable **Email/Password** authentication
5. (Optional) Enable other authentication methods as needed

### Step 3: Get Your Firebase Config

1. In Firebase Console, click the gear icon next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. If you haven't already, click the web icon (`</>`) to register a web app
5. Copy the Firebase configuration values

### Step 4: Configure Your App

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Firebase credentials:
   ```bash
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. (Optional) Update the API base URL if needed:
   ```bash
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

### Step 5: Test Your Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the signup page and create a test account
3. Check Firebase Console > Authentication > Users to verify the user was created

## 📁 Project Structure

```
src/
├── features/
│   └── auth/
│       ├── types/
│       │   ├── user.types.ts      # User and auth state types
│       │   └── index.ts           # Type exports
│       ├── services/
│       │   ├── firebase-auth.ts   # Firebase auth operations
│       │   ├── authService.ts     # Helper functions
│       │   └── index.ts
│       ├── store/
│       │   ├── authSlice.ts       # Redux auth slice
│       │   ├── authSelectors.ts   # Redux selectors
│       │   └── index.ts
│       ├── hooks/
│       │   ├── useAuthUser.ts     # Hook to access current user
│       │   └── index.ts
│       ├── context/
│       │   └── AuthContext.tsx    # React context for auth
│       └── index.ts               # Main auth exports
├── lib/
│   └── firebase.ts                # Firebase initialization
└── store/
    └── redux/
        ├── store.ts               # Redux store with auth reducer
        └── hooks.ts               # Typed Redux hooks
```

## 🔑 Available Auth Functions

### Using Redux (Recommended)

```typescript
import { useAppDispatch, useAppSelector } from '@/store/redux/hooks'
import { loginUser, signupUser, logoutUser } from '@/features/auth'
import { selectUser, selectIsAuthenticated } from '@/features/auth'

function MyComponent() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  const handleLogin = async () => {
    await dispatch(loginUser({ email, password }))
  }

  const handleSignup = async () => {
    await dispatch(signupUser({ email, password, fullName }))
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
  }
}
```

### Using Context (Alternative)

```typescript
import { useAuth } from '@/features/auth'

function MyComponent() {
  const { user, loading, login, signup, logout } = useAuth()

  const handleLogin = async () => {
    try {
      await login(email, password)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }
}
```

### Direct Firebase Service

```typescript
import { 
  loginWithEmail, 
  registerWithEmail, 
  getCurrentUser,
  logout 
} from '@/features/auth'

// Login
const response = await loginWithEmail(email, password)
if (response.success) {
  console.log('Logged in:', response.user)
}

// Register
const response = await registerWithEmail(name, email, password)
if (response.success) {
  console.log('User created:', response.user)
}

// Get current user
const user = await getCurrentUser()

// Logout
await logout()
```

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use Firebase Security Rules** - Configure in Firebase Console
3. **Enable email verification** - Add email verification flow
4. **Implement password reset** - Already available via `sendPasswordResetEmail`
5. **Add rate limiting** - Configure in Firebase Console
6. **Monitor authentication** - Use Firebase Analytics

## 🐛 Common Issues & Solutions

### Issue: "Firebase not initialized"
**Solution**: Make sure you've created `.env.local` with your Firebase credentials.

### Issue: "auth/operation-not-allowed"
**Solution**: Enable Email/Password authentication in Firebase Console.

### Issue: "Module not found errors"
**Solution**: Run `npm install` to ensure all dependencies are installed.

### Issue: "Vite environment variables not loading"
**Solution**: 
- Restart your dev server after changing `.env.local`
- Make sure your env file is named `.env.local` (not just `.env`)

## 📚 Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Redux Toolkit](https://redux-toolkit.js.org/)

## ✨ Next Steps

1. ✅ Set up your Firebase project
2. ✅ Add your credentials to `.env.local`
3. ✅ Test authentication in your app
4. 🔜 Implement email verification
5. 🔜 Add password reset UI
6. 🔜 Configure Firebase Security Rules
7. 🔜 Add social authentication (Google, GitHub, etc.)
