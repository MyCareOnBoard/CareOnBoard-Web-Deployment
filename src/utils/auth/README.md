# Auth Feature Module

A complete authentication feature module following best practices for separation of concerns. All authentication-related logic, state management, API calls, and UI components are organized in one place.

## 📁 Folder Structure

```
src/features/auth/
├── api/                    # API client for auth operations
│   └── client.ts          # Authenticated HTTP requests & user creation
├── components/            # Auth UI components
│   ├── AuthLayout.tsx    # Shared layout for auth pages
│   └── AuthTestComponent.tsx  # Testing component
├── context/              # React Context
│   └── AuthContext.tsx   # Auth provider & useAuth hook
├── hooks/                # Custom hooks
│   ├── useAuthUser.ts    # Hook for auth state & actions
│   └── index.ts
├── services/             # Business logic & external services
│   ├── authService.ts    # Redux thunks & transformers
│   ├── firebase-auth.ts  # Firebase authentication functions
│   └── index.ts
├── store/                # Redux state management
│   ├── authSlice.ts     # Redux slice with actions & reducers
│   ├── authSelectors.ts # Memoized selectors
│   └── index.ts
├── types/                # TypeScript interfaces
│   ├── user.types.ts    # User interface definitions
│   └── index.ts
├── index.ts              # Main barrel export
└── README.md            # This file
```

## 🚀 Quick Start

### Import Everything from One Place

```typescript
import {
  // Context & Hooks
  AuthProvider,
  useAuth,
  useAuthUser,

  // Components
  AuthLayout,

  // Redux
  authReducer,
  setUser,
  clearUser,
  selectUser,
  selectIsAuthenticated,

  // API
  api,
  createUser,

  // Services
  loginWithEmail,
  registerWithEmail,
  getCurrentUser,

  // Types
  User,
} from "@/utils/auth";
```

## 📦 What's Included

### 1. Context (`context/`)

**AuthContext** provides authentication state to your entire app:

```typescript
const { user, loading, login, signup, logout, resetPassword, getToken } =
  useAuth();
```

### 2. Redux Store (`store/`)

**Redux Toolkit** for global state management with persistence:

```typescript
import { useAppDispatch, useAppSelector } from "@/store/redux/hooks";
import { setUser, selectUser, selectIsAuthenticated } from "@/utils/auth";

function MyComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
}
```

### 3. Firebase Auth (`services/firebase-auth.ts`)

Core authentication functions:

- `loginWithEmail(email, password)` - User login
- `registerWithEmail(name, email, password)` - User registration
- `sendPasswordResetEmail(email)` - Password reset
- `logout()` - Sign out user
- `getCurrentUser()` - Get current user
- `getIdToken()` - Get Firebase ID token

### 4. API Client (`api/client.ts`)

Authenticated HTTP requests:

```typescript
import { api, createUser } from "@/utils/auth";

// RESTful methods
const data = await api.get("/endpoint");
await api.post("/endpoint", { data });
await api.put("/endpoint", { data });
await api.delete("/endpoint");

// Create user in backend
await createUser("John Doe");
```

### 5. Components (`components/`)

- **AuthLayout** - Shared layout for login/signup/forgot-password pages
- **AuthTestComponent** - Testing component for development

## 🎯 Usage Examples

### Wrap Your App

```typescript
// src/main.tsx
import { AuthProvider } from '@/utils/auth'

<Provider store={store}>
  <PersistGate persistor={persistor}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </PersistGate>
</Provider>
```

### Login Page

```typescript
import { useAuth, AuthLayout } from '@/utils/auth'

export default function LoginPage() {
  const { login } = useAuth()

  const handleLogin = async (email, password) => {
    try {
      await login(email, password)
      navigate('/applicant/dashboard')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <AuthLayout>
      {/* Your form here */}
    </AuthLayout>
  )
}
```

### Protected Route

```typescript
import { useAuth } from '@/utils/auth'

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login')
    }
  }, [user, loading])

  return <div>Welcome {user?.name}!</div>
}
```

### Using Redux Selectors

```typescript
import { useAppSelector } from '@/store/redux/hooks'
import { selectUser, selectIsAuthenticated, selectAuthLoading } from '@/utils/auth'

function Profile() {
  const user = useAppSelector(selectUser)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const loading = useAppSelector(selectAuthLoading)

  if (loading) return <Spinner />
  if (!isAuthenticated) return <LoginPrompt />

  return <div>{user.fullName}</div>
}
```

## 🔐 Authentication Flow

1. **User logs in** → `useAuth().login()`
2. **Firebase authenticates** → `firebase-auth.ts` handles Firebase
3. **Local state updates** → Context updates `user` state
4. **Redux syncs** → Dispatches `setUser()` to Redux store
5. **Persistence** → `redux-persist` saves to localStorage
6. **Page reload** → State restored from localStorage

## 📊 State Management

The auth feature uses **dual state management**:

### Context State (Local)

- Fast, synchronous access
- Used by components directly via `useAuth()`
- Ideal for UI state and auth methods

### Redux State (Global)

- Centralized, persisted state
- Accessible anywhere in the app
- Survives page reloads via redux-persist

Both states stay in sync automatically!

## 🔄 API Integration

### Authenticated Requests

All API requests automatically include the Firebase auth token:

```typescript
import { api } from "@/utils/auth";

// Token is automatically added to headers
const userData = await api.get("/users/me");
```

### Manual Token Access

```typescript
import { useAuth } from "@/utils/auth";

const { getToken } = useAuth();
const token = await getToken(); // Get Firebase ID token
```

## 📝 Type Definitions

### User Type (Redux)

```typescript
interface User {
  uid: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  photoURL?: string;
  phoneNumber?: string;
}
```

### Auth State (Redux)

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
```

## 🧪 Testing

Use the included test component:

```typescript
import { AuthTestComponent } from '@/utils/auth'

// In your dev environment
<AuthTestComponent />
```

## 🛠️ Extending the Feature

### Add New Auth Method

1. Add function to `services/firebase-auth.ts`
2. Add method to `context/AuthContext.tsx`
3. Export from `index.ts`

### Add New API Endpoint

1. Add function to `api/client.ts`
2. Export from `index.ts`

### Add New Redux Action

1. Add action to `store/authSlice.ts`
2. Add selector to `store/authSelectors.ts`
3. Export from `store/index.ts`

## 📚 Related Files

### Page Components (Outside Feature)

Auth page components remain in their original locations:

- `/src/layouts/login/page.tsx` - Login page
- `/src/layouts/signup/page.tsx` - Signup page
- `/src/layouts/forgot-password/page.tsx` - Password reset page
- `/src/layouts/dashboard/page.tsx` - Protected dashboard

These pages import from `@/utils/auth` for all auth functionality.

## 🎨 Key Benefits

✅ **Single Source of Truth** - All auth code in one place  
✅ **Easy to Find** - No hunting across folders  
✅ **Easy to Maintain** - Changes are isolated  
✅ **Easy to Test** - Clear boundaries  
✅ **Easy to Scale** - Add new features without cluttering  
✅ **Type Safe** - Full TypeScript support  
✅ **Well Documented** - Clear API and examples

## 🔗 Dependencies

- Firebase Auth - Authentication provider
- Redux Toolkit - State management
- Redux Persist - State persistence
- React Context - Component state
- Sonner - Toast notifications

---

**Last Updated:** October 28, 2025  
**Maintained by:** Care on Board Team
