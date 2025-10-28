# Firebase Emulator Setup Guide

This project is configured to use Firebase Emulators for local development and testing.

## 🚀 Quick Start

### Prerequisites

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase** (if not already done):
```bash
firebase init
```
Select:
- Authentication
- Firestore (optional)
- Emulators

## 📋 Running the Emulators

### Option 1: Run Emulators Only
```bash
npm run emulators
```

This starts:
- **Auth Emulator**: http://127.0.0.1:9099
- **Firestore Emulator**: http://127.0.0.1:8080 (if configured)
- **Emulator UI**: http://127.0.0.1:4000

### Option 2: Run App + Emulators (Recommended)

First, open two terminals:

**Terminal 1** - Start emulators:
```bash
npm run emulators
```

**Terminal 2** - Start dev server:
```bash
npm run dev
```

Or install `concurrently` and use:
```bash
npm install -D concurrently
npm run dev:emulator
```

## ⚙️ Configuration

### Environment Variables

The `.env.local` file controls emulator usage:

```bash
# Set to 'true' to use emulators (default for development)
VITE_USE_FIREBASE_EMULATOR=true

# Set to 'false' to use production Firebase
# VITE_USE_FIREBASE_EMULATOR=false
```

### Emulator Ports

Configured in `firebase.json`:
- **Auth**: 9099
- **Firestore**: 8080
- **UI**: 4000

## 💾 Data Persistence

### Export Emulator Data
Save current emulator state:
```bash
npm run emulators:export
```
This creates `./emulator-data` folder with your test data.

### Import Emulator Data
Start emulators with previously saved data:
```bash
npm run emulators:import
```

## 🧪 Testing Features

### Create Test Users

With emulators running, you can:

1. **Sign up new users** - They'll be created in the emulator
2. **Login with test accounts** - No real email verification needed
3. **Test password reset** - Check console logs for reset links

### Access Emulator UI

Visit http://127.0.0.1:4000 to:
- View all users in Auth emulator
- Inspect Firestore data
- Clear emulator data
- Monitor requests

## 🔄 Redux Persistence

User authentication state is automatically persisted using Redux Persist:

- **Storage**: localStorage
- **Key**: `root`
- **Persisted Data**: 
  - User object (uid, email, fullName, etc.)
  - Authentication status
  - Loading state

### Check Persisted State

Open browser DevTools → Application → Local Storage → `persist:root`

### Clear Persisted State

```javascript
// In browser console
localStorage.clear()
```

## 📝 Development Workflow

1. **Start emulators**: `npm run emulators`
2. **Start dev server**: `npm run dev` (in new terminal)
3. **Open app**: http://localhost:5173
4. **Open emulator UI**: http://127.0.0.1:4000

### Test Authentication Flow

```bash
# 1. Sign up a new user
Email: test@example.com
Password: Test123!
Name: Test User

# 2. Logout

# 3. Login again - user data persists in Redux
Email: test@example.com
Password: Test123!

# 4. Refresh page - user stays logged in (Redux Persist)
```

## 🐛 Troubleshooting

### Emulator Already Running
```bash
# Kill existing emulator processes
pkill -f firebase
# Or restart your terminal
```

### Port Already in Use
Change ports in `firebase.json`:
```json
{
  "emulators": {
    "auth": {
      "port": 9099  // Change this
    }
  }
}
```

### Cannot Connect to Emulator
1. Check emulators are running: `firebase emulators:list`
2. Verify `VITE_USE_FIREBASE_EMULATOR=true` in `.env.local`
3. Check browser console for connection errors

### Redux State Not Persisting
1. Check localStorage is enabled in browser
2. Verify Redux Persist is configured in `store.ts`
3. Check browser DevTools → Application → Local Storage

## 🔐 Production vs Development

### Development (Emulators)
```bash
VITE_USE_FIREBASE_EMULATOR=true
```
- Uses local emulators
- No real data
- Fast testing
- No Firebase quota usage

### Production (Real Firebase)
```bash
VITE_USE_FIREBASE_EMULATOR=false
```
- Uses production Firebase project
- Real user data
- Quota limits apply
- Requires proper Firebase setup

## 📚 Additional Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Redux Persist](https://github.com/rt2zz/redux-persist)
- [Firebase Auth](https://firebase.google.com/docs/auth)

## ✅ Verification

To verify everything is working:

1. Start emulators: `npm run emulators`
2. Check emulator UI: http://127.0.0.1:4000
3. Start app: `npm run dev`
4. Sign up a test user
5. Check user appears in Emulator UI → Authentication
6. Check Redux state in DevTools → Application → Local Storage
7. Refresh page - verify user stays logged in
8. Logout - verify Redux state clears

You're all set! 🎉
