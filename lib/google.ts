// lib/google.ts
const GOOGLE_REDIRECT_PATH = "/api/auth/google/callback";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolveGoogleRedirectUri(requestUrl: URL) {
  const configured = process.env.GOOGLE_REDIRECT_URI;
  if (configured && !isLocalHost(requestUrl.hostname)) {
    return configured;
  }

  return `${requestUrl.origin}${GOOGLE_REDIRECT_PATH}`;
}
