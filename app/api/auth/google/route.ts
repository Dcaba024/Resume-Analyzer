import { NextResponse } from "next/server";
import { resolveGoogleRedirectUri } from "@/lib/google";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectPath = requestUrl.searchParams.get("redirect") || "/dashboard";

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      {
        error:
          "Google OAuth not configured. Set GOOGLE_CLIENT_ID in your environment.",
      },
      { status: 500 }
    );
  }

  const redirectUri = resolveGoogleRedirectUri(requestUrl);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", encodeURIComponent(redirectPath));

  return NextResponse.redirect(authUrl.toString());
}
