'use client'

import { useState } from 'react'
import { useResumeStore } from '../lib/store'
import { extractTextFromPDF } from '../lib/pdfParser'

export default function ResumeUpload() {
  const { resumeText, setResumeText } = useResumeStore()
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const text = await extractTextFromPDF(file)
      setResumeText(text)
      setFileName(file.name)
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label
            htmlFor="resume-upload"
            className="block text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]"
          >
            Resume Upload
          </label>
          <p className="mt-3 text-xl font-semibold text-white">
            Drop in the resume you want to refine.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {fileName ?? 'PDF only. We extract the text so the analysis stays ATS-safe.'}
          </p>
        </div>
        <label
          htmlFor="resume-upload"
          className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[var(--accent)] hover:bg-[rgba(125,211,199,0.12)]"
        >
          Choose File
        </label>
      </div>

      <label
        htmlFor="resume-upload"
        className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-10 text-center transition hover:border-[var(--accent)] hover:bg-[rgba(125,211,199,0.08)]"
      >
        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
          PDF Parser
        </span>
        <span className="mt-4 text-lg font-semibold text-white">
          {fileName ?? 'Choose a resume PDF'}
        </span>
        <span className="mt-2 max-w-md text-sm leading-6 text-slate-400">
          The extracted text becomes the source for analysis, rewriting, and the final download.
        </span>
      </label>

      <input
        id="resume-upload"
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      {resumeText && (
        <p className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-100">
          Resume uploaded and parsed successfully.
        </p>
      )}
    </section>
  )
}
