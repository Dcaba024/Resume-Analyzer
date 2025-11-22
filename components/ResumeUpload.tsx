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
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="resume-upload" className="block text-sm font-medium">
            Upload Resume (PDF)
          </label>
          <p className="text-xs text-gray-400">
            {fileName ?? 'PDF files only'}
          </p>
        </div>
        <label
          htmlFor="resume-upload"
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Choose File
        </label>
      </div>

      <input
        id="resume-upload"
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      {resumeText && (
        <p className="mt-2 text-sm text-green-400">
          ✅ Resume uploaded and parsed.
        </p>
      )}
    </div>
  )
}
