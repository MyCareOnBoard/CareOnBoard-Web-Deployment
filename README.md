# Care On Board

A modern React application built with TypeScript, Vite, and React Router. This application provides a platform for managing care services with a clean, responsive UI.

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
