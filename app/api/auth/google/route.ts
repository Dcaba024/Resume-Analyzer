import { NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectPath = requestUrl.searchParams.get("redirect") || "/dashboard";

  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      {
        error:
          "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.",
      },
      { status: 500 }
    );
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", encodeURIComponent(redirectPath));

  return NextResponse.redirect(authUrl.toString());
}
