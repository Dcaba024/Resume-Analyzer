import Link from "next/link";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import AnalyzeButton from "@/components/AnalyzeButton";
import SignOutButton from "@/components/SignOutButton";
import { getCurrentUser } from "@/lib/auth";
import {
  getMembershipLabel,
  getUserAccessInfo,
  hasActiveMembership,
} from "@/lib/db";

export default async function AnalyzerPage() {
  const user = await getCurrentUser();

  if (!user?.email) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">Sign in to continue</h1>
          <p className="mt-3 text-gray-400">
            You need to be signed in to run resume analyses.
          </p>
          <Link
            href="/signin"
            className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  const accessInfo = await getUserAccessInfo(user.email);
  const credits = accessInfo?.credits ?? 0;
  const membershipPlan = accessInfo?.membershipPlan ?? null;
  const membershipExpiresAt = accessInfo?.membershipExpiresAt ?? null;
  const membershipActive = hasActiveMembership(accessInfo);
  const canAnalyze = credits > 0 || membershipActive;
  const membershipLabel = getMembershipLabel(membershipPlan);
  const statusLabel = membershipActive
    ? membershipPlan === "lifetime"
      ? "Unlimited access (Lifetime)"
      : `${membershipLabel ?? "Membership"} active until ${
          membershipExpiresAt
            ? new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(membershipExpiresAt)
            : ""
        }`
    : `Credits remaining: ${credits}`;

  if (!canAnalyze) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">Access locked</h1>
          <p className="mt-3 text-gray-400">
            Purchase a credit or membership to unlock another resume analysis.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            View plans
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            ATS Resume Analyzer
          </Link>
          <div className="flex flex-col items-start gap-1 text-sm text-gray-400 sm:items-end">
            <p className="font-medium text-white">{statusLabel}</p>
            {!membershipActive && (
              <p>
                Need more?{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-blue-400 hover:text-blue-300"
                >
                  Purchase credits
                </Link>
              </p>
            )}
            <SignOutButton />
          </div>
        </nav>

        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
            Resume analyzer
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Run your analysis</h1>
          <p className="mt-3 text-gray-400">
            Upload your resume and paste the job description to see how well you
            match and what to improve.
          </p>
        </header>

        <div className="w-full space-y-8 rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-lg">
          <ResumeUpload />
          <JobDescriptionInput />
          <AnalyzeButton />
        </div>
      </div>
    </main>
  );
}
