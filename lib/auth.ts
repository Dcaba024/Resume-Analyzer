// lib/auth.ts
import { cookies } from "next/headers";

export const USER_COOKIE_KEY = "resume_user_email";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const email = cookieStore.get(USER_COOKIE_KEY)?.value;
  if (!email) {
    return null;
  }

  return { email };
}

export async function clearCurrentUser() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE_KEY);
}
