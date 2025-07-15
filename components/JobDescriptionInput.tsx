'use client'

import { useResumeStore } from '../lib/store'

export default function JobDescriptionInput() {
  const { jobDescription, setJobDescription } = useResumeStore()

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Paste Job Description</label>
      <textarea
        rows={6}
        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-md text-sm text-white resize-none"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste a job listing here..."
      />
    </div>
  )
}
