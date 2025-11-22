"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = useMemo(
    () => searchParams.get("session_id"),
    [searchParams]
  );
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    sessionId ? "pending" : "success"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmSession = async () => {
      if (!sessionId) return;
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not confirm payment.");
        }
        setStatus("success");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not confirm payment.";
        setError(message);
        setStatus("error");
      }
    };

    confirmSession();
  }, [sessionId]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg text-center max-w-md">
        <CheckCircle className="text-green-400 w-16 h-16 mx-auto mb-4" />

        <h1 className="text-3xl font-bold mb-2">Payment Successful 🎉</h1>

        <p className="text-gray-400 mb-6">
          {status === "pending"
            ? "Finalizing your credits..."
            : status === "error"
            ? error
            : "Your credits or membership have been applied to your account."}
        </p>

        <Link
          href="/dashboard"
          className="block w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium"
        >
          Go to Dashboard
        </Link>

        <Link
          href="/pricing"
          className="block w-full mt-3 text-gray-400 underline"
        >
          Buy More Credits
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
