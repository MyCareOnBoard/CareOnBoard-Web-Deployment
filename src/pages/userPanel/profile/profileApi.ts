import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import axiosClient from "@/lib/axios";
import { auth } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/utils/auth/helpers/errorMessages";

export { PASSWORD_RULES, meetsPasswordRules } from "@/lib/passwordRules";

/** Staff sign in with email and password; anyone else has no password to change here. */
export const hasPasswordSignIn = () => Boolean(auth.currentUser?.providerData.some((provider) => provider.providerId === "password"));

function signedInUser() {
  const user = auth.currentUser;
  if (!user?.email) throw Object.assign(new Error("You're signed out. Log in again and retry."), { code: "app/signed-out" });
  return user;
}

/** Firebase only changes a password right after a fresh sign-in, so check the current one first. */
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = signedInUser();
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, currentPassword));
  await updatePassword(user, newPassword);
}

export function passwordErrorMessage(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "That password isn't right. Check it and try again.";
  if (code === "app/signed-out") return (error as Error).message;
  return getAuthErrorMessage(error);
}

export async function removeProfilePicture() {
  await axiosClient.put("/users/profile", { profilePicture: null });
  const user = auth.currentUser;
  // The page falls back to the Firebase photo, so clear that copy too.
  if (user?.photoURL) await updateProfile(user, { photoURL: null }).catch(() => undefined);
}
