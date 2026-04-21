import Link from "next/link";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import AnalyzeButton from "@/components/AnalyzeButton";

export default async function AnalyzerPage() {
  return (
    <main className="min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-fade absolute inset-x-0 top-0 h-[34rem] opacity-60" />
        <div className="absolute left-[8%] top-28 h-48 w-48 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute right-[10%] top-20 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <nav className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <Link href="/" className="text-sm font-semibold tracking-[0.24em] text-white uppercase">
            Resume Intelligence
          </Link>
          <div className="flex items-center gap-3 text-xs text-slate-300 sm:text-sm">
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 font-medium text-emerald-100">
              Free to use
            </span>
            <span className="text-slate-400">No sign-in required</span>
          </div>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <header className="panel-sheen rounded-[2rem] border border-white/10 bg-[var(--panel)] px-7 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:px-10 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
              ATS Resume Analyzer
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Get a resume score and targeted fixes in under 30 seconds.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Upload your resume, paste the job description, and get recruiter-style
              feedback, a clearer rewrite, and a download-ready version that matches
              what you see on screen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Get feedback like a recruiter
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Resume score + fixes
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Same-text PDF download
              </span>
            </div>
            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Used For</p>
                <p className="mt-2 text-lg font-semibold text-white">Job seekers</p>
                <p className="mt-1 text-slate-400">Built for faster resume review loops.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Perspective</p>
                <p className="mt-2 text-lg font-semibold text-white">Recruiter-style</p>
                <p className="mt-1 text-slate-400">Feedback focused on clarity, fit, and keywords.</p>
              </div>
              <div className="rounded-2xl border border-emerald-300/18 bg-[rgba(125,211,199,0.08)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/85">Trust Fix</p>
                <p className="mt-2 text-lg font-semibold text-white">Output consistency fixed</p>
                <p className="mt-1 text-slate-300">
                  The displayed resume and downloaded file now use the same final text.
                </p>
              </div>
            </div>
          </header>

          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/10 bg-[var(--panel-strong)] p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Focus</p>
              <p className="mt-3 text-2xl font-semibold text-white">Cleaner language</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Better structure and tighter phrasing without stuffing keywords.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[var(--panel-strong)] p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Output</p>
              <p className="mt-3 text-2xl font-semibold text-white">Critical consistency fix</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                A trust-breaking mismatch between display and download was fixed so both outputs stay aligned.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(125,211,199,0.18),rgba(8,20,31,0.88))] p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/80">Workflow</p>
              <p className="mt-3 text-2xl font-semibold text-white">Fast review loop</p>
              <p className="mt-2 text-sm leading-6 text-slate-100/75">
                Analyze, refine, and download without leaving the page.
              </p>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel-strong)] p-6 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
              Example Output
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              See what users get before they upload anything.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Showing the output upfront makes the product easier to trust. This example
              mirrors the kind of analysis, score change, and rewrite improvement the tool produces.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-200/85">Before</p>
              <p className="mt-3 text-lg font-semibold text-white">Resume says too little</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-400">
                <p>Score: 46 / 100</p>
                <p>Weak summary and generic bullets.</p>
                <p>Missing job language around analytics, stakeholder reporting, and SQL.</p>
                <p>Formatting feels flat and undersells relevant experience.</p>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-emerald-300/16 bg-[linear-gradient(180deg,rgba(125,211,199,0.1),rgba(6,16,24,0.76))] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/85">After</p>
              <p className="mt-3 text-lg font-semibold text-white">Clearer, stronger, more targeted</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-200/85">
                <p>Score: 72 / 100</p>
                <p>Sharper summary tied to the target role.</p>
                <p>Rewritten bullets surface reporting, dashboards, SQL, and measurable scope.</p>
                <p>Preview and downloaded PDF match exactly.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="panel-sheen w-full space-y-8 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
          <ResumeUpload />
          <JobDescriptionInput />
          <AnalyzeButton />
        </div>
      </div>
    </main>
  );
}
