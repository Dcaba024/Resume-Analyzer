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
              Make your resume look sharper, read cleaner, and match better.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Upload your current resume, paste the target job description, and get
              a polished rewrite, ATS match feedback, and a download-ready version
              in one flow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                Recruiter-style output
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                ATS-safe formatting
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                PDF download
              </span>
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
              <p className="mt-3 text-2xl font-semibold text-white">Same-text download</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The on-screen resume and PDF now use one shared final version.
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

        <div className="panel-sheen w-full space-y-8 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
          <ResumeUpload />
          <JobDescriptionInput />
          <AnalyzeButton />
        </div>
      </div>
    </main>
  );
}
