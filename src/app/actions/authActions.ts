"use server";

import { auth, sendPasswordResetEmail } from "@/lib/firebase";

// This action does not need to return anything to the client for security reasons.
// The client will always display a generic success message.
export async function sendPasswordResetAction(email: string): Promise<void> {
  if (!email) {
    // Silently fail if no email is provided.
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    // Email sent successfully (or at least the request was valid)
  } catch (error: any) {
    // We catch the error to prevent it from propagating to the client.
    // This prevents revealing whether a user exists or not.
    // We can log the error on the server for debugging.
    console.error("Password Reset Error (Not sent to client):", error.code, error.message);
  }
}
