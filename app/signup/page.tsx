"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(
    () => searchParams.get("redirect") || "/dashboard",
    [searchParams]
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          age: age ? Number(age) : null,
          education,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to sign up.");
      }

      const target = data.redirect || redirectPath || "/pricing";
      router.push(target);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    const params = new URLSearchParams();
    params.set("redirect", redirectPath);
    params.set("firstName", firstName);
    params.set("lastName", lastName);
    params.set("age", age);
    params.set("education", education);
    const target = `/api/auth/google?${params.toString()}`;
    window.location.href = target;
  };

  const certificationSuggestions = [
    "B.S. Computer Science",
    "B.A. Business Administration",
    "MBA",
    "M.S. Data Science",
    "Certified Scrum Master",
    "PMP Certification",
    "AWS Certified Solutions Architect",
    "Google Analytics Certification",
    "Cisco CCNA",
    "Six Sigma Green Belt",
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            ATS Resume Analyzer
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 transition hover:text-gray-200"
          >
            Back home
          </Link>
        </div>

        <section className="rounded-3xl border border-gray-800 bg-gray-900/60 p-8 shadow-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
            Sign up
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-gray-400">
            Add a few basic details or continue with Google to get started
            instantly.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-600 px-4 py-3 text-sm font-semibold text-white transition hover:border-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.35 11.1h-9.17v3.52h5.35a4.88 4.88 0 0 1-2.08 2.94v2.45h3.37c1.98-1.81 3.13-4.54 3.13-7.76 0-.7-.05-1.38-.15-2.05Z" />
              <path d="M12.18 22c2.8 0 5.14-.93 6.85-2.49l-3.37-2.45c-.93.63-2.15 1-3.48 1-2.68 0-4.95-1.81-5.76-4.23H3.95v2.57A9.82 9.82 0 0 0 12.18 22Z" />
              <path d="M6.42 13.83a5.88 5.88 0 0 1 0-3.65V7.61H3.95a9.82 9.82 0 0 0 0 8.78Z" />
              <path d="M12.18 5.97c1.52 0 2.89.52 3.97 1.54l2.98-2.98C16.92 2.67 14.58 1.75 12.18 1.75A9.82 9.82 0 0 0 3.95 7.61l2.47 2.57c.81-2.42 3.08-4.23 5.76-4.23Z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
            <span className="h-px flex-1 bg-gray-700" />
            or
            <span className="h-px flex-1 bg-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-2xl border border-gray-700 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-2xl border border-gray-700 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="age">
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  min="1"
                  required
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="w-full rounded-2xl border border-gray-700 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="28"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="education">
                  Degrees or certifications (comma separated)
                </label>
                <input
                  id="education"
                  type="text"
                  list="education-options"
                  value={education}
                  onChange={(event) => setEducation(event.target.value)}
                  className="w-full rounded-2xl border border-gray-700 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="MBA, AWS Certified Solutions Architect"
                />
                <datalist id="education-options">
                  {certificationSuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500">
                  Start typing to see suggestions. Separate multiple entries with
                  commas.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-gray-700 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-gray-700 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href={`/signin?redirect=${encodeURIComponent(redirectPath)}`}
              className="font-semibold text-white hover:text-blue-300"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpContent />
    </Suspense>
  );
}
