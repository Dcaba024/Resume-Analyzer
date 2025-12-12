import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
// Update the url to point to any asset in /public or an external image
const heroBackgroundImage = "url('/hero-background.jpg')";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 pb-16 pt-8 lg:px-8 lg:pt-12">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            ATS Resume Analyzer
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signin"
              className="rounded-full border border-gray-700 px-4 py-2 text-sm font-medium transition hover:border-gray-500 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-gray-700 px-4 py-2 text-sm font-medium transition hover:border-gray-500 hover:text-white"
            >
              Sign Up
            </Link>
            <Link
              href="/pricing"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              One-Time Purchase
            </Link>
          </div>
        </nav>

        <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/30">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: heroBackgroundImage,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative z-10 px-6 py-16 text-center md:px-12">
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-gray-400">
              Built for job seekers
            </p>
            <h1 className="mb-6 text-4xl font-semibold leading-tight md:text-5xl">
              Stand out with a resume that passes every ATS filter.
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-300">
              Upload your resume, drop in a job description, and let our AI show
              you exactly how to improve before you apply.
            </p>
            <div className="mt-4 text-gray-400">
              <p>Built for job seekers who want transparency, not guesswork.</p>
              <p className="mx-auto mt-2 max-w-3xl text-sm text-gray-500">
                ATS Resume Analyzer exists to close the gap between your
                experience and the systems that gatekeep interviews. We help you
                translate your wins into recruiter-friendly language, identify
                high-impact keywords, and keep your documents in an ATS-proof
                format so you can start every application with confidence.
              </p>
            </div>
            <div className="mt-6 grid gap-4 text-left text-sm text-gray-300 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                <p className="font-semibold text-white">Our Mission</p>
                <p className="mt-2 text-gray-400">
                  Empower underrepresented candidates with crystal-clear
                  guidance, so every resume reflects the real value you bring.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                <p className="font-semibold text-white">What We Offer</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-gray-400">
                  <li>AI rewritten resumes tailored to each job</li>
                  <li>Keyword + ATS compliance insights</li>
                  <li>Flexible pricing from single-credits to memberships</li>
                  <li>Instant feedback with secure PDF parsing</li>
                </ul>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href={user?.email ? "/dashboard" : "/signin"}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
              >
                Start Building
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
