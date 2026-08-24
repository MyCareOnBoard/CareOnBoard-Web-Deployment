import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import app from "./firebase";

// Keep Firestore reads aligned with API writes (getDb uses x-environment / VITE_API_ENVIRONMENT).
// Explicit VITE_FIREBASE_DATABASE_ID overrides auto-selection.
export const apiEnvironment = import.meta.env.VITE_API_ENVIRONMENT || "staging";

const explicitDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
const resolvedDatabaseId =
  explicitDatabaseId !== undefined && explicitDatabaseId !== ""
    ? explicitDatabaseId
    : apiEnvironment === "staging"
      ? "staging"
      : undefined;

export const firestoreDatabaseId = resolvedDatabaseId;

export const db = resolvedDatabaseId
  ? getFirestore(app, resolvedDatabaseId)
  : getFirestore(app);

if (import.meta.env.DEV) {
  const expectedFromApi = apiEnvironment === "staging" ? "staging" : "(default)";
  const actual = resolvedDatabaseId || "(default)";
  console.info(
    `[firebase] API env: ${apiEnvironment}, Firestore DB: ${actual} (expected from API: ${expectedFromApi})`,
  );
  if (expectedFromApi !== actual) {
    console.warn(
      "[firebase] Firestore database may not match API x-environment. " +
        "Set VITE_FIREBASE_DATABASE_ID or align VITE_API_ENVIRONMENT.",
    );
  }
}

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.log("✅ Connected to Firestore Emulator on port 8080");
  } catch {
    console.warn("⚠️ Firestore emulator connection may already be established");
  }
}
