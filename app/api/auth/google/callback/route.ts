import { NextResponse } from "next/server";
import { ensureUserWithCredits, updateUserProfile } from "@/lib/db";
import { USER_COOKIE_KEY } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const redirectPath = state ? decodeURIComponent(state) : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=google", request.url));
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Google OAuth not configured." },
      { status: 500 }
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/signin?error=google_token", request.url)
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token as string | undefined;

  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/signin?error=google_token", request.url)
    );
  }

  const profileResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!profileResponse.ok) {
    return NextResponse.redirect(
      new URL("/signin?error=google_profile", request.url)
    );
  }

  const profile = await profileResponse.json();
  const email = (profile.email as string | undefined)?.toLowerCase();
  const firstName =
    (profile.given_name as string | undefined) ||
    (profile.name as string | undefined)?.split?.(" ")?.[0];
  const lastName = profile.family_name as string | undefined;

  if (!email) {
    return NextResponse.redirect(
      new URL("/signin?error=google_no_email", request.url)
    );
  }

  await ensureUserWithCredits(email, 5);
  await updateUserProfile(email, {
    firstName: firstName ?? null,
    lastName: lastName ?? null,
  });

  const origin = url.origin;
  const safeRedirect = redirectPath.startsWith("/")
    ? redirectPath
    : "/dashboard";
  const response = NextResponse.redirect(`${origin}${safeRedirect}`);

  response.cookies.set({
    name: USER_COOKIE_KEY,
    value: email,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
