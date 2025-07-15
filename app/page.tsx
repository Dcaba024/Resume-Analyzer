'use client'

import ResumeUpload from '../components/ResumeUpload'
import JobDescriptionInput from '../components/JobDescriptionInput'
import AnalyzeButton from '../components/AnalyzeButton'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-12 flex flex-col items-center">
      <div className="max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">
          🎯 AI Resume Analyzer
        </h1>
        <p className="text-lg text-gray-400">
          Upload your resume and job description to get a match score,
          improvement suggestions, and missing keywords — all powered by AI.
        </p>
        <p className="text-xs text-gray-500 mt-2 text-center">
          *AI feedback is currently simulated for demo purposes.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-8 bg-gray-900 p-6 rounded-2xl shadow-lg">
        <ResumeUpload />
        <JobDescriptionInput />
        <AnalyzeButton />
      </div>
    </main>
  );
}
