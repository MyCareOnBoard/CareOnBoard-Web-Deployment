# Care On Board

CareOnBoard is a HIPAA-compliant SaaS platform designed to simplify and modernize caregiver onboarding and compliance management for agencies serving individuals with developmental disabilities (DDD) and home care needs. A modern React application built with TypeScript, Vite, and React Router. 

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
CareOnBoard’s initial client is Morning Star Supportive Services, a New Jersey-based care agency. 

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
   - Copy `.env.example` to `.env`
   - Update the environment variables as needed

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
├── assets/           # Static assets (images, fonts, etc.)
├── components/       # Reusable UI components
│   └── ui/           # Base UI components (buttons, inputs, etc.)
├── features/         # Feature-based modules
│   └── splash/       # Example feature module
├── layouts/          # Layout components
├── lib/              # Utility functions and helpers
├── routes/           # Application routes configuration
├── store/            # State management (Redux)
├── types/            # TypeScript type definitions
├── App.tsx           # Root component
└── main.tsx          # Application entry point
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

## 🔧 Editor Setup

We recommend using [VS Code](https://code.visualstudio.com/) with the following extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
