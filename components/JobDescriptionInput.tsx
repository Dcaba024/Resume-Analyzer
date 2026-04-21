'use client'

import { useResumeStore } from '../lib/store'

export default function JobDescriptionInput() {
  const { jobDescription, setJobDescription } = useResumeStore()

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 sm:p-6">
      <label className="block text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
        Job Description
      </label>
      <p className="mt-3 text-xl font-semibold text-white">
        Paste the role you want to optimize for.
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Use the full listing when possible so the keyword and match analysis has enough context.
      </p>
      <textarea
        rows={8}
        className="mt-5 w-full resize-none rounded-[1.5rem] border border-white/10 bg-[rgba(4,12,20,0.72)] px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--accent)] focus:bg-[rgba(7,17,26,0.92)]"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste the job listing here. Include responsibilities, requirements, tools, and preferred qualifications."
      />
    </section>
  )
}
