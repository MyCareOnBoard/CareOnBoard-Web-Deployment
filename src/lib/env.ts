// Add your required environment variables here
const requiredEnvVars = [
  // "VITE_API_URL",
  // "VITE_FIREBASE_API_KEY",
  // Add other required env vars
] as const;

export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (envVar) => !import.meta.env[envVar]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Typed environment variables
export const env = {
  // apiUrl: import.meta.env.VITE_API_URL as string,
  // firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
