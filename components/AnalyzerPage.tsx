import Link from "next/link";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import AnalyzeButton from "@/components/AnalyzeButton";

export default async function AnalyzerPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold">
            ATS Resume Analyzer
          </Link>
          <div className="flex flex-col items-start gap-1 text-sm text-gray-400 sm:items-end">
            <p className="font-medium text-white">Free to use</p>
            <p>No sign-in or payment required.</p>
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
