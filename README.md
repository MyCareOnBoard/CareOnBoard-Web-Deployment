# CareOnboard

CareOnboard is a HIPAA-compliant SaaS platform designed to simplify and modernize caregiver onboarding and compliance management for agencies serving individuals with developmental disabilities (DDD) and home care needs. A modern React application built with TypeScript, Vite, and React Router.

The platform helps provider agencies manage end-to-end onboarding, including background checks, drug testing, certification tracking, Electronic Visit Verification (EVV), and payroll integration — reducing paperwork, improving compliance, and enabling faster staff deployment with a clean, responsive UI.

Key Highlights
Target market: DDD and home care agencies in New Jersey (scaling nationwide).

Core functions:

Caregiver onboarding & credential management

Automated background checks (via Checkr)

Drug test scheduling (via Health Street / LabCorp / Quest)

EVV clock-in/out with GPS tracking and state-format exports (Sandata/Open EVV)

Payroll/time tracking integrations (ADP, Gusto, QuickBooks)

Admin dashboards, reports, and audit logging

Compliance: Built for HIPAA, FCRA, EEOC, and WCAG 2.1 standards.

Tech stack: React + Vite (web), React Native (mobile), Firebase (backend).

Tagline: “Powering Care, Less Paperwork.”

Business Context
CareOnboard’s initial client is Morning Star Supportive Services, a New Jersey-based care agency.

The project is being developed by iOta Digital Lab LLC, led by Nathan Kwadade, with a distributed engineering team.
The build is structured around four milestones — onboarding, credential management, EVV, and payroll/reporting — with the first release scheduled for November 2025 and backend

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/care-on-board.git
   cd care-on-board
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Backend API Configuration
   VITE_API_BASE_URL=https://us-central1-care-on-board.cloudfunctions.net

   # API Environment (development, staging, production)
   VITE_API_ENVIRONMENT=development
   ```

   See the [Environment Variables](#-environment-variables) section for more details.

4. **Start the development server**

   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. **Build for production**
   ```bash
   pnpm build
   pnpm preview
   ```

## 🏗️ Project Structure

```
src/
├── __mocks__/                    # Mock files for testing
│   └── browserMocks.ts
├── assets/                       # Static assets
│   ├── icons/                    # SVG icons
│   │   ├── bell.svg, calendar.svg, user.svg, etc.
│   │   └── images/               # User profile images
│   └── onboarding_assets/        # Onboarding-specific images
│       └── stage-1.png, stage-2.png, etc.
├── components/                   # Reusable components
│   ├── ErrorBoundary.tsx         # Global error boundary
│   ├── ProtectedRoute.tsx        # Route protection wrapper
│   └── ui/                       # Base UI components (22 components)
│       ├── button.tsx, input.tsx, card.tsx
│       ├── form.tsx, checkbox.tsx, select.tsx
│       ├── dialog.tsx, popover.tsx, calendar.tsx
│       └── file-upload.tsx, loader.tsx, etc.
├── hooks/                        # Custom React hooks
│   ├── use-mobile.tsx            # Mobile detection hook
│   └── use-toast.tsx             # Toast notification hook
├── layouts/                      # Layout components
│   ├── AppLayout.tsx             # Main application layout
│   └── DashboardLayout.tsx       # Dashboard-specific layout
├── lib/                          # Library code and utilities
│   ├── api/                      # API client functions
│   │   ├── help-center.ts        # Help center endpoints
│   │   ├── job-application.ts   # Job application endpoints
│   │   ├── otp.ts                # OTP verification endpoints
│   │   ├── settings.ts           # Settings endpoints
│   │   └── users.ts              # User management endpoints
│   ├── api-types.ts              # API TypeScript types
│   ├── axios.ts                  # Axios client configuration
│   ├── baseQuery.ts              # Base query setup
│   ├── env.ts                    # Environment configuration
│   ├── firebase.ts               # Firebase configuration
│   └── utils.ts                  # General utilities
├── pages/                        # Page components (feature-based)
│   ├── application/              # Job application flow
│   │   ├── components/           # Application-specific components
│   │   │   ├── __tests__/        # Component tests
│   │   │   ├── ProfilePreScreeningStep.tsx
│   │   │   ├── ConditionalHireStep.tsx
│   │   │   ├── DocumentUploadStep.tsx
│   │   │   ├── OrientationStep.tsx
│   │   │   ├── DigitalSignature.tsx
│   │   │   └── FinalReviewStep.tsx
│   │   ├── api.ts                # Application API calls
│   │   ├── types.ts              # Application types
│   │   └── index.tsx             # Main application page
│   ├── dashboard/                # Dashboard page
│   │   └── index.tsx
│   ├── documents/                # Document management
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── index.tsx
│   ├── onboarding/               # User onboarding flow
│   │   ├── components/           # Onboarding components
│   │   │   ├── OnboardingSlider.tsx
│   │   │   ├── VerifyEmail.tsx
│   │   │   ├── VerifyOTP.tsx
│   │   │   ├── EmailVerificationComplete.tsx
│   │   │   └── SlideOne.tsx - SlideFour.tsx
│   │   ├── __tests__/            # Onboarding tests
│   │   ├── api.ts
│   │   └── index.tsx
│   ├── profile/                  # User profile page
│   │   ├── components/
│   │   │   └── SuccessModal.tsx
│   │   └── index.tsx
│   ├── settings/                 # Settings page
│   │   ├── components/
│   │   │   ├── AccountTab.tsx
│   │   │   ├── NotificationTab.tsx
│   │   │   └── SaveSuccessPopover.tsx
│   │   ├── __tests__/            # Settings tests
│   │   └── index.tsx
│   ├── help-center/              # Help center page
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── forgot-password/          # Password recovery
│   ├── reset-password/           # Password reset
│   └── splash/                   # Splash screen
├── routes/                       # Routing configuration
│   ├── constants.ts              # Route path constants
│   └── index.ts                  # Route definitions
├── store/                        # Redux state management
│   └── redux/
│       ├── store.ts              # Redux store configuration
│       └── hooks.ts              # Typed Redux hooks
├── utils/                        # Utility modules
│   └── auth/                     # Authentication utilities
│       ├── api/                  # Auth API client
│       │   └── client.ts
│       ├── context/              # Auth React context
│       │   └── AuthContext.tsx
│       ├── hooks/                # Auth hooks
│       │   ├── useAuthUser.ts
│       │   └── index.ts
│       ├── services/             # Auth services
│       │   ├── authService.ts
│       │   ├── firebase-auth.ts
│       │   └── index.ts
│       ├── store/                # Auth Redux slice
│       │   ├── authSlice.ts
│       │   ├── authSelectors.ts
│       │   └── index.ts
│       ├── types/                # Auth TypeScript types
│       │   ├── user.types.ts
│       │   └── index.ts
│       └── README.md             # Auth module documentation
├── App.tsx                       # Root component
├── main.tsx                      # Application entry point
├── index.css                     # Global styles
├── setupTests.ts                 # Test setup configuration
├── test-utils.tsx                # Testing utilities
└── vite-env.d.ts                 # Vite type definitions
```

## 🛠️ Tech Stack

- ⚡ [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- ⚛️ [React 19](https://react.dev/) - A JavaScript library for building user interfaces
- 🎨 [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- 🚀 [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- 🔄 [React Router](https://reactrouter.com/) - Declarative routing for React
- 🛠️ [Redux Toolkit](https://redux-toolkit.js.org/) - State management
- 🎭 [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components
- 📦 [pnpm](https://pnpm.io/) - Fast, disk space efficient package manager

## 📝 Scripts

- `dev` - Start development server
- `build` - Build for production
- `preview` - Preview production build
- `lint` - Run ESLint
- `test` - Run tests
- `test:watch` - Run tests in watch mode
- `test:coverage` - Run tests with coverage report

## 🔐 Environment Variables

The application requires the following environment variables:

### Required Variables

| Variable               | Description                       | Example                                                |
| ---------------------- | --------------------------------- | ------------------------------------------------------ |
| `VITE_API_BASE_URL`    | Backend API base URL              | `https://us-central1-care-on-board.cloudfunctions.net` |
| `VITE_API_ENVIRONMENT` | Environment name for API requests | `development`, `staging`, or `production`              |

### Configuration

1. **Development**: Use `VITE_API_ENVIRONMENT=development` for local development
2. **Staging**: Use `VITE_API_ENVIRONMENT=staging` for staging environment
3. **Production**: Use `VITE_API_ENVIRONMENT=production` for production builds

### How It Works

- The axios client automatically includes the `x-environment` header in all API requests
- Authentication tokens are automatically added via the `Authorization: Bearer` header
- Both variables must be set for the application to communicate with the backend

### Example `.env` File

```env
# Backend API Configuration
VITE_API_BASE_URL=https://us-central1-care-on-board.cloudfunctions.net

# API Environment
VITE_API_ENVIRONMENT=staging
```

**Note**: Environment variables prefixed with `VITE_` are exposed to the client-side code. Never store sensitive secrets in these variables.

## 🌐 API Integration

The application uses a global axios client configured with automatic authentication and environment headers.

### API Client Features

- ✅ Automatic Bearer token authentication
- ✅ Environment header injection (`x-environment`)
- ✅ Request/response interceptors
- ✅ Global error handling
- ✅ TypeScript type definitions

### Available API Functions

Located in `src/lib/api/job-application.ts`:

- `uploadResume(file)` - Upload resume file
- `submitPreScreening(data)` - Submit pre-screening form
- `getApplicationStatus()` - Get current application status
- `submitJobApplication(data)` - Submit complete job application

## 🧪 Testing

The project uses Vitest and React Testing Library for comprehensive test coverage.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm test ProfilePreScreeningStep
```

### Test Coverage

- ✅ Unit tests for components
- ✅ Integration tests for user flows
- ✅ API mocking with Vitest
- ✅ Accessibility testing
- ✅ Form validation testing

### Test Files

Tests are located in `__tests__` directories alongside components:

```
src/pages/application/components/__tests__/
├── ProfilePreScreeningStep.test.tsx          # Unit tests
├── ProfilePreScreeningStep.integration.test.tsx  # Integration tests
└── README.md                                  # Test documentation
```

For more details, see the [test documentation](src/pages/applicant/application/components/__tests__/README.md).

## 🔧 Editor Setup

We recommend using [VS Code](https://code.visualstudio.com/) with the following extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## 📄 License

This project is licensed under the MIT License.
