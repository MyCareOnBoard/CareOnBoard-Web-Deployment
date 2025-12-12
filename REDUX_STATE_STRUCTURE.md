# Redux State Structure

## Auth State

The auth state follows a single source of truth pattern for user data.

### Structure

```typescript
{
  auth: {
    user: {
      // Core user fields (always at top level)
      id: string
      uid: string
      email: string
      fullName: string
      emailVerified: boolean
      userType: "applicant" | "employee" | "agency" | "super_admin"
      
      // Convenience fields (extracted from profile)
      agencyId: string              // ✅ SINGLE SOURCE OF TRUTH for agency ID
      onboardingCompleted: boolean
      otpVerified: boolean
      
      // Timestamps
      createdAt: FirebaseTimestamp | Date
      updatedAt: FirebaseTimestamp | Date
      
      // Profile sub-object (detailed user data)
      profile: {
        agencyId: string
        fullName: string
        email: string
        phoneNumber: string
        address: string
        city: string
        state: string
        zipCode: string
        gender: string
        dateOfBirth: string
        profilePicture: string
        professionalSummary: string
        // ... other profile fields
      }
    },
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
  }
}
```

## Single Source of Truth Rules

### ✅ DO
- Access agency ID: `user.agencyId` or `user?.agencyId`
- Access user ID: `user.id` or `user?.id`
- Access profile details: `user.profile.fullName`, `user.profile.address`, etc.
- Update user via Redux: `dispatch(setUser(user))`

### ❌ DON'T
- Access `user.agency.id` (deprecated)
- Access `user.profile.id` as agency ID
- Create separate `profile` object in Redux state
- Store agencyId anywhere except `user.agencyId`

## Migration Notes

If you see a redundant `profile` object at the root level of auth state (alongside `user`), it means:
1. Old persisted state is being loaded
2. Code is incorrectly dispatching profile separately

**Solution**: Clear browser localStorage and refresh:
```javascript
localStorage.clear()
location.reload()
```

## Type Reference

The primary user type is `User` (with `UserProfile` as an alias for backward compatibility):

```typescript
import type { User, UserProfile } from '@/utils/auth/types/user.types'

// Both are equivalent:
const user1: User = ...
const user2: UserProfile = ...
```
