"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      const res = await fetch("/api/auth/signout", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Unable to sign out.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="rounded-full border border-gray-700 px-4 py-2 font-medium text-white transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSigningOut ? "Signing out..." : "Sign Out"}
    </button>
  );
}
